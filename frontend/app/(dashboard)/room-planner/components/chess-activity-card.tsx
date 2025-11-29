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

  return (
    <div
      className={cn(
        'absolute left-1 right-1 rounded-md cursor-pointer transition-all hover:z-20',
        'border-l-4 overflow-hidden',
        'hover:shadow-lg hover:scale-[1.02]',
        isCurrentlyActive && 'animate-pulse ring-2 ring-red-500 ring-offset-1',
        activity.status === 'CANCELLED' && 'opacity-50 line-through'
      )}
      style={{
        top: style.top,
        height: style.height,
        backgroundColor: `${activity.color}15`,
        borderLeftColor: activity.color,
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
            'text-[9px] font-medium text-muted-foreground whitespace-nowrap leading-tight',
            isTiny && 'hidden'
          )}
        >
          {activity.startTime} - {activity.endTime}
        </span>

        {/* Название */}
        <span
          className={cn(
            'text-[11px] font-semibold truncate leading-tight',
            isTiny && 'text-[9px]'
          )}
          style={{ color: activity.color }}
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
