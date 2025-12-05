'use client';

import { useState, memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useActivityClipboardStore } from '@/lib/stores/activity-clipboard-store';
import { toast } from 'sonner';
import type { Activity } from '@/hooks/use-room-planner';

interface ChessActivityCardProps {
  activity: Activity;
  style: React.CSSProperties;
  onClick: () => void;
  isCurrentlyActive?: boolean;
  scale?: number;
  /** Включить drag-and-drop */
  isDraggable?: boolean;
}

export const ChessActivityCard = memo(function ChessActivityCard({
  activity,
  style,
  onClick,
  isCurrentlyActive,
  scale = 1.0,
  isDraggable = false,
}: ChessActivityCardProps) {
  const isCancelled = activity.status === 'CANCELLED';
  const canCopy = activity.type === 'rental' || activity.type === 'reservation';
  const copyActivity = useActivityClipboardStore((state) => state.copyActivity);

  // Состояние контекстного меню
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleCopy = () => {
    copyActivity(activity);
    toast.success('Событие скопировано в буфер обмена');
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!canCopy) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Drag-and-drop хук
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: activity.id,
    data: {
      type: activity.type,
      activity,
    },
    disabled: !isDraggable || isCancelled,
  });

  // Собираем весь текст в одну строку
  const fullText = [
    `${activity.startTime}-${activity.endTime}`,
    activity.title,
    activity.subtitle,
  ].filter(Boolean).join(', ');

  // Обрезка до 52 символов
  const truncatedText = fullText.length > 52 ? fullText.slice(0, 52) + '…' : fullText;

  // Стиль трансформации при перетаскивании
  const dragStyle: React.CSSProperties = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : {};

  const cardContent = (
    <div
      ref={setNodeRef}
      className={cn(
        'absolute cursor-pointer transition-shadow duration-200 hover:z-50',
        'overflow-hidden shadow-sm hover:shadow-lg',
        isCancelled && 'opacity-60',
        isDragging && 'invisible', // Скрываем оригинал при drag
        isDraggable && !isCancelled && 'cursor-grab active:cursor-grabbing'
      )}
      style={{
        ...style,
        ...dragStyle,
        backgroundColor: `${activity.color}40`,
        ...(isCancelled && {
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 4px,
            rgba(0,0,0,0.1) 4px,
            rgba(0,0,0,0.1) 8px
          )`,
        }),
      }}
      onClick={(e) => {
        // Не открывать диалог, если идет перетаскивание
        if (!isDragging) {
          onClick();
        }
      }}
      onContextMenu={handleContextMenu}
      {...(isDraggable ? { ...listeners, ...attributes } : {})}
    >
      <p
        className="h-full px-1.5 py-0.5 leading-snug text-foreground overflow-hidden"
        style={{
          fontSize: `${12 * scale}px`,
          hyphens: 'auto',
          textAlign: 'left',
          WebkitHyphens: 'auto',
          wordBreak: 'break-word',
        }}
        lang="ru"
      >
        {isCurrentlyActive && (
          <span className="inline-block w-1.5 h-1.5 mr-1 rounded-full bg-green-500 animate-pulse align-middle" />
        )}
        {truncatedText}
      </p>
    </div>
  );

  // Если перетаскивается - не показывать tooltip
  if (isDragging) {
    return cardContent;
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[280px]">
          <div className="space-y-1">
            <div className="font-semibold">{activity.title}</div>
            {activity.subtitle && (
              <div className="text-sm text-muted-foreground">{activity.subtitle}</div>
            )}
            <div className="text-sm">
              {activity.startTime} - {activity.endTime}
            </div>
            {isDraggable && !isCancelled && (
              <div className="text-xs text-muted-foreground pt-1 border-t">
                Перетащите для перемещения
              </div>
            )}
            {canCopy && (
              <div className="text-xs text-muted-foreground pt-1 border-t">
                Правый клик для копирования
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Контекстное меню копирования */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="fixed z-50 bg-popover border rounded-md shadow-md p-1 min-w-[10rem]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              onClick={handleCopy}
            >
              <Copy className="mr-2 h-4 w-4" />
              Копировать
            </button>
          </div>
        </>
      )}
    </>
  );
});

/**
 * Компонент для DragOverlay - идентичен оригинальной карточке
 */
export function DragOverlayCard({
  activity,
  style,
  scale = 1.0,
}: {
  activity: Activity;
  style: React.CSSProperties;
  scale?: number;
}) {
  const fullText = [
    `${activity.startTime}-${activity.endTime}`,
    activity.title,
    activity.subtitle,
  ].filter(Boolean).join(', ');

  const truncatedText = fullText.length > 52 ? fullText.slice(0, 52) + '…' : fullText;

  return (
    <div
      className={cn(
        'absolute cursor-grabbing',
        'overflow-hidden shadow-lg',
      )}
      style={{
        ...style,
        backgroundColor: `${activity.color}40`,
      }}
    >
      <p
        className="h-full px-1.5 py-0.5 leading-snug text-foreground overflow-hidden"
        style={{
          fontSize: `${12 * scale}px`,
          hyphens: 'auto',
          textAlign: 'left',
          WebkitHyphens: 'auto',
          wordBreak: 'break-word',
        }}
        lang="ru"
      >
        {truncatedText}
      </p>
    </div>
  );
}

