'use client';

import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useWeekActivities, type Activity, type ActivityType } from '@/hooks/use-room-planner';
import { useRooms } from '@/hooks/use-rooms';
import {
  CHESS_GRID,
  generateTimeSlots,
  getTimeFromRowIndex,
  getDayName,
  getDayNumber,
  isCurrentWeek,
  formatTimeLabel,
  layoutOverlappingEvents,
} from '@/lib/utils/chess-grid';
import { timeToMinutes } from '@/lib/utils/time-slots';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChessWeekViewProps {
  weekStartDate: string;
  roomIds?: string[];
  activityTypes?: ActivityType[];
  onActivityClick: (activity: Activity) => void;
  onEmptySlotClick: (date: string, startTime: string, endTime: string) => void;
}

// Ширина колонки времени
const TIME_COLUMN_WIDTH = 50;

/**
 * Расчет позиции карточки в процентах от общей высоты
 */
function getActivityPositionPercent(startTime: string, endTime: string): { top: number; height: number } {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const gridStartMinutes = CHESS_GRID.START_HOUR * 60;
  const gridEndMinutes = CHESS_GRID.END_HOUR * 60;
  const totalMinutes = gridEndMinutes - gridStartMinutes;

  // Ограничиваем время в пределах рабочих часов
  const effectiveStart = Math.max(startMinutes, gridStartMinutes);
  const effectiveEnd = Math.min(endMinutes, gridEndMinutes);

  const top = ((effectiveStart - gridStartMinutes) / totalMinutes) * 100;
  const height = ((effectiveEnd - effectiveStart) / totalMinutes) * 100;

  return { top, height };
}

/**
 * Расчет позиции линии текущего времени в процентах
 */
function getCurrentTimePositionPercent(): number | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const gridStartMinutes = CHESS_GRID.START_HOUR * 60;
  const gridEndMinutes = CHESS_GRID.END_HOUR * 60;

  if (currentMinutes < gridStartMinutes || currentMinutes > gridEndMinutes) {
    return null;
  }

  const totalMinutes = gridEndMinutes - gridStartMinutes;
  return ((currentMinutes - gridStartMinutes) / totalMinutes) * 100;
}

/**
 * Получить текущую дату в формате YYYY-MM-DD
 */
function getCurrentDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ChessWeekView({
  weekStartDate,
  roomIds,
  activityTypes,
  onActivityClick,
  onEmptySlotClick,
}: ChessWeekViewProps) {
  // Получаем данные за неделю
  const { weekActivities, weekDates, isLoading } = useWeekActivities({
    weekStartDate,
    roomIds,
    activityTypes,
  });

  // Получаем список помещений для отображения названий
  const { data: rooms } = useRooms();
  const roomsMap = useMemo(() => {
    if (!rooms) return new Map<string, string>();
    return new Map(rooms.map((r) => [r.id, r.name]));
  }, [rooms]);

  // Временные слоты для отображения
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Позиция линии текущего времени (в процентах)
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);
  const [todayDate] = useState(getCurrentDate());

  // Текущая неделя?
  const isThisWeek = isCurrentWeek(weekStartDate);

  // Обновляем позицию линии текущего времени каждую минуту
  useEffect(() => {
    if (!isThisWeek) {
      setCurrentTimePosition(null);
      return;
    }

    const updatePosition = () => {
      setCurrentTimePosition(getCurrentTimePositionPercent());
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // каждую минуту

    return () => clearInterval(interval);
  }, [isThisWeek]);

  // Загрузка
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="border rounded-lg bg-background overflow-hidden h-[calc(100vh-100px)] overflow-x-auto">
        <div className="flex flex-col h-full" style={{ minWidth: 'min-content' }}>
          {/* Заголовок с днями недели */}
          <div className="flex-shrink-0 flex border-b">
            {/* Пустая ячейка над колонкой времени */}
            <div
              className="flex-shrink-0 border-r bg-muted/30"
              style={{ width: TIME_COLUMN_WIDTH }}
            />
            {/* Заголовки дней */}
            {weekDates.map((date) => {
              const isToday = date === todayDate;
              return (
                <div
                  key={date}
                  className={cn(
                    'flex-1 border-r px-2 py-1.5 bg-muted/30 min-w-[120px]',
                    isToday && 'bg-primary/10'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isToday ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {getDayName(date)}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        isToday && 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center'
                      )}
                    >
                      {getDayNumber(date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Основная сетка */}
          <div className="flex-1 flex overflow-y-hidden">
            {/* Колонка времени */}
            <div
              className="flex-shrink-0 flex flex-col border-r bg-background"
              style={{ width: TIME_COLUMN_WIDTH }}
            >
              {timeSlots.map((time, index) => (
                <div
                  key={time}
                  className={cn(
                    'flex-1 flex items-start justify-end pr-1 text-xs text-muted-foreground border-b min-h-0',
                    index % 2 === 0 ? 'font-medium' : 'text-[10px] opacity-60'
                  )}
                >
                  <span className="-mt-1.5">{index % 2 === 0 ? formatTimeLabel(time) : ''}</span>
                </div>
              ))}
            </div>

            {/* Колонки дней */}
            {weekDates.map((date) => (
              <DayColumn
                key={date}
                date={date}
                activities={weekActivities[date] || []}
                timeSlots={timeSlots}
                onActivityClick={onActivityClick}
                onEmptySlotClick={onEmptySlotClick}
                currentTimePosition={date === todayDate ? currentTimePosition : null}
                roomsMap={roomsMap}
                isToday={date === todayDate}
              />
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// Компонент колонки дня
interface DayColumnProps {
  date: string;
  activities: Activity[];
  timeSlots: string[];
  onActivityClick: (activity: Activity) => void;
  onEmptySlotClick: (date: string, startTime: string, endTime: string) => void;
  currentTimePosition: number | null;
  roomsMap: Map<string, string>;
  isToday: boolean;
}

function DayColumn({
  date,
  activities,
  timeSlots,
  onActivityClick,
  onEmptySlotClick,
  currentTimePosition,
  roomsMap,
  isToday,
}: DayColumnProps) {
  // Состояние выделения
  const [selection, setSelection] = useState<{ startRow: number; endRow: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Расчет layout для пересекающихся событий
  const activitiesWithLayout = useMemo(
    () => layoutOverlappingEvents(activities),
    [activities]
  );

  // Обработчик начала выделения
  const handleMouseDown = (rowIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    setIsSelecting(true);
    setSelection({ startRow: rowIndex, endRow: rowIndex });
  };

  // Обработчик движения выделения
  const handleMouseEnter = (rowIndex: number) => {
    if (isSelecting && selection) {
      setSelection({ ...selection, endRow: rowIndex });
    }
  };

  // Обработчик окончания выделения
  const handleMouseUp = () => {
    if (isSelecting && selection) {
      const minRow = Math.min(selection.startRow, selection.endRow);
      const maxRow = Math.max(selection.startRow, selection.endRow);

      const { startTime } = getTimeFromRowIndex(minRow);
      const { endTime } = getTimeFromRowIndex(maxRow);

      onEmptySlotClick(date, startTime, endTime);
    }
    setIsSelecting(false);
    setSelection(null);
  };

  // Глобальный обработчик mouseup
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        handleMouseUp();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, selection]);

  // Проверка, выделена ли ячейка
  const isCellSelected = (rowIndex: number) => {
    if (!selection) return false;
    const minRow = Math.min(selection.startRow, selection.endRow);
    const maxRow = Math.max(selection.startRow, selection.endRow);
    return rowIndex >= minRow && rowIndex <= maxRow;
  };

  return (
    <div
      className={cn(
        'flex-1 border-r relative flex flex-col select-none min-w-[120px]',
        isToday && 'bg-primary/5'
      )}
      onMouseUp={handleMouseUp}
    >
      {/* Фоновые ячейки (строки) */}
      {timeSlots.map((_, index) => (
        <div
          key={index}
          className={cn(
            'flex-1 border-b cursor-pointer transition-colors min-h-0',
            index % 2 === 0 ? 'bg-background' : 'bg-muted/20',
            isToday && (index % 2 === 0 ? 'bg-primary/5' : 'bg-primary/10'),
            isCellSelected(index) && 'bg-primary/20',
            !isCellSelected(index) && 'hover:bg-muted/50'
          )}
          onMouseDown={(e) => handleMouseDown(index, e)}
          onMouseEnter={() => handleMouseEnter(index)}
        />
      ))}

      {/* Карточки активностей */}
      {activitiesWithLayout.map((activity) => {
        const position = getActivityPositionPercent(activity.startTime, activity.endTime);
        const roomName = roomsMap.get(activity.roomId) || 'Помещение';

        // Вычисляем ширину и позицию для пересекающихся событий
        const width = 100 / activity.totalColumns;
        const left = activity.column * width;

        return (
          <WeekActivityCard
            key={activity.id}
            activity={activity}
            style={{
              top: `${position.top}%`,
              height: `${position.height}%`,
              left: `${left}%`,
              width: `${width}%`,
            }}
            onClick={() => onActivityClick(activity)}
            roomName={roomName}
          />
        );
      })}

      {/* Линия текущего времени */}
      {currentTimePosition !== null && (
        <div
          className="absolute left-0 right-0 z-20 pointer-events-none"
          style={{ top: `${currentTimePosition}%` }}
        >
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="flex-1 h-0.5 bg-red-500" />
          </div>
        </div>
      )}
    </div>
  );
}

// Карточка активности для недельного вида
interface WeekActivityCardProps {
  activity: Activity;
  style: { top: string; height: string; left: string; width: string };
  onClick: () => void;
  roomName: string;
}

function WeekActivityCard({ activity, style, onClick, roomName }: WeekActivityCardProps) {
  const heightPercent = parseFloat(style.height);
  const widthPercent = parseFloat(style.width);
  const isCompact = heightPercent < 5;
  const isTiny = heightPercent < 3.6;
  const isNarrow = widthPercent < 50;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'absolute rounded cursor-pointer transition-all hover:z-30',
            'border-l-[3px] overflow-hidden',
            'hover:shadow-lg hover:brightness-95',
            activity.status === 'CANCELLED' && 'opacity-50'
          )}
          style={{
            top: style.top,
            height: style.height,
            left: `calc(${style.left} + 2px)`,
            width: `calc(${style.width} - 4px)`,
            backgroundColor: `${activity.color}20`,
            borderLeftColor: activity.color,
          }}
          onClick={onClick}
        >
          <div className="h-full px-1 py-0.5 flex flex-col justify-center overflow-hidden">
            {/* Время */}
            {!isTiny && !isNarrow && (
              <span className="text-[8px] font-medium text-muted-foreground whitespace-nowrap leading-tight">
                {activity.startTime}
              </span>
            )}

            {/* Название */}
            <span
              className={cn(
                'font-semibold truncate leading-tight',
                isTiny || isNarrow ? 'text-[8px]' : 'text-[10px]'
              )}
              style={{ color: activity.color }}
            >
              {activity.title}
            </span>

            {/* Помещение */}
            {!isCompact && !isNarrow && (
              <span className="text-[8px] text-muted-foreground truncate leading-tight">
                {roomName}
              </span>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[250px]">
        <div className="space-y-1">
          <div className="font-semibold" style={{ color: activity.color }}>
            {activity.title}
          </div>
          {activity.subtitle && (
            <div className="text-sm text-muted-foreground">{activity.subtitle}</div>
          )}
          <div className="text-sm">
            {activity.startTime} - {activity.endTime}
          </div>
          <div className="text-sm text-muted-foreground">{roomName}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
