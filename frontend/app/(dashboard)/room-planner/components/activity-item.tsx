'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Key, Star, Lock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Activity } from '@/hooks/use-room-planner';
import { ACTIVITY_TYPE_LABELS } from '@/hooks/use-room-planner';

interface ActivityItemProps {
  activity: Activity;
  isCurrentlyActive?: boolean;
  variant?: 'compact' | 'detailed';
}

// Иконки для типов активностей
const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  schedule: Calendar,
  rental: Key,
  event: Star,
  reservation: Lock,
};

export function ActivityItem({
  activity,
  isCurrentlyActive = false,
  variant = 'detailed',
}: ActivityItemProps) {
  const Icon = ACTIVITY_ICONS[activity.type] || Calendar;

  // Проверяем, является ли активность мероприятием
  const isEvent = activity.type === 'event';

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-sm py-1.5 px-2 rounded-md -mx-2',
          isCurrentlyActive && 'bg-red-50 border border-red-200 font-medium',
          activity.status === 'CANCELLED' && 'line-through opacity-50'
        )}
      >
        {/* Цветовой индикатор */}
        <div
          className="w-1 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: activity.color }}
        />

        {/* Время */}
        <span className={cn(
          'text-xs w-20 flex-shrink-0',
          isCurrentlyActive ? 'text-red-600' : 'text-muted-foreground'
        )}>
          {activity.startTime}–{activity.endTime}
        </span>

        {/* Название */}
        <span className="truncate flex-1">{activity.title}</span>

        {/* Индикатор "сейчас" */}
        {isCurrentlyActive && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        isCurrentlyActive && 'bg-red-50 border-red-200',
        activity.status === 'CANCELLED' && 'opacity-50'
      )}
    >
      {/* Иконка */}
      <div
        className="p-2 rounded-md flex-shrink-0"
        style={{ backgroundColor: `${activity.color}20` }}
      >
        <Icon className="h-4 w-4" style={{ color: activity.color }} />
      </div>

      {/* Контент */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium truncate',
              activity.status === 'CANCELLED' && 'line-through'
            )}
          >
            {activity.title}
          </span>

          {isCurrentlyActive && (
            <Badge variant="destructive" className="text-xs">
              Сейчас
            </Badge>
          )}

          {activity.status === 'CANCELLED' && (
            <Badge variant="secondary" className="text-xs">
              Отменено
            </Badge>
          )}
        </div>

        {activity.subtitle && (
          <p className="text-sm text-muted-foreground truncate">
            {activity.subtitle}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>
            {activity.startTime} – {activity.endTime}
          </span>
          <Badge variant="outline" className="text-xs">
            {ACTIVITY_TYPE_LABELS[activity.type]}
          </Badge>
        </div>

        {/* Кнопка журнала посещаемости для мероприятий */}
        {isEvent && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              asChild
            >
              <Link href={`/admin/events/${activity.id}`}>
                <Users className="h-3 w-3 mr-1" />
                Журнал посещаемости
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
