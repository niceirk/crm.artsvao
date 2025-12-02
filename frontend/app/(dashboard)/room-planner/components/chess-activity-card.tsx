'use client';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Activity } from '@/hooks/use-room-planner';

interface ChessActivityCardProps {
  activity: Activity;
  style: React.CSSProperties;
  onClick: () => void;
  isCurrentlyActive?: boolean;
  scale?: number;
}

export function ChessActivityCard({
  activity,
  style,
  onClick,
  isCurrentlyActive,
  scale = 1.0,
}: ChessActivityCardProps) {
  const isCancelled = activity.status === 'CANCELLED';

  // Собираем весь текст в одну строку
  const fullText = [
    `${activity.startTime}-${activity.endTime}`,
    activity.title,
    activity.subtitle,
  ].filter(Boolean).join(', ');

  // Обрезка до 52 символов
  const truncatedText = fullText.length > 52 ? fullText.slice(0, 52) + '…' : fullText;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'absolute cursor-pointer transition-shadow duration-200 hover:z-50',
            'overflow-hidden rounded-md shadow-sm hover:shadow-lg',
            isCancelled && 'opacity-60'
          )}
          style={{
            ...style,
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
          onClick={onClick}
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
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
