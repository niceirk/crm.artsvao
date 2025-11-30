'use client';

import { cn } from '@/lib/utils';
import type { Activity } from '@/hooks/use-room-planner';

interface ChessActivityCardProps {
  activity: Activity;
  style: { top: string; height: string };
  onClick: () => void;
  isCurrentlyActive?: boolean;
}

export function ChessActivityCard({
  activity,
  style,
  onClick,
  isCurrentlyActive,
}: ChessActivityCardProps) {
  // Парсим высоту в проценты для определения компактности
  const heightPercent = parseFloat(style.height);
  const isCompact = heightPercent < 5; // меньше 5% (примерно 40 минут)
  const isTiny = heightPercent < 3.6; // меньше 3.6% (примерно 30 минут)

  const isCancelled = activity.status === 'CANCELLED';

  return (
    <div
      className={cn(
        'absolute left-1 right-1 cursor-pointer transition-all hover:z-20',
        'overflow-hidden rounded-md',
        'hover:shadow-lg hover:scale-[1.02]',
        isCurrentlyActive && 'animate-pulse ring-2 ring-red-500 ring-offset-1',
        isCancelled && 'opacity-60'
      )}
      style={{
        top: style.top,
        height: style.height,
        backgroundColor: `${activity.color}25`,
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
      title={`${activity.title}${activity.subtitle ? ` - ${activity.subtitle}` : ''}\n${activity.startTime} - ${activity.endTime}`}
    >
      <div
        className={cn(
          'h-full px-2 py-0.5 flex flex-col justify-center overflow-hidden',
        )}
      >
        {/* Время */}
        <span
          className={cn(
            'text-[9px] font-medium whitespace-nowrap leading-tight text-foreground/70',
            isTiny && 'hidden'
          )}
        >
          {activity.startTime} - {activity.endTime}
        </span>

        {/* Название */}
        <span
          className={cn(
            'text-[11px] font-semibold truncate leading-tight text-foreground',
            isTiny && 'text-[9px]'
          )}
        >
          {activity.title}
        </span>

        {/* Подзаголовок (преподаватель / арендатор) */}
        {activity.subtitle && !isCompact && (
          <span className="text-[9px] text-muted-foreground truncate leading-tight">
            {activity.subtitle}
          </span>
        )}
      </div>

      {/* Индикатор "сейчас" */}
      {isCurrentlyActive && (
        <div className="absolute top-0 right-0 w-2 h-2 m-0.5 rounded-full bg-red-500 animate-pulse" />
      )}
    </div>
  );
}
