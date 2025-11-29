'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRoomPlanner, type Activity, type RoomWithActivities, type ActivityType } from '@/hooks/use-room-planner';
import { ChessActivityCard } from './chess-activity-card';
import {
  CHESS_GRID,
  TOTAL_ROWS,
  generateTimeSlots,
  getTimeFromRowIndex,
  isToday,
  formatTimeLabel,
} from '@/lib/utils/chess-grid';
import { timeToMinutes } from '@/lib/utils/time-slots';
import { isActivityCurrentlyActive } from '@/lib/utils/time-slots';

interface ChessViewProps {
  date: string;
  roomIds?: string[];
  activityTypes?: ActivityType[];
  onActivityClick: (activity: Activity) => void;
  onEmptySlotClick: (roomId: string, startTime: string, endTime: string) => void;
}

// Ширина колонки времени
const TIME_COLUMN_WIDTH = 60;
// Минимальная ширина колонки помещения
const MIN_ROOM_COLUMN_WIDTH = 150;

// Состояние выделения
interface SelectionState {
  roomId: string;
  startRow: number;
  endRow: number;
}

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

export function ChessView({
  date,
  roomIds,
  activityTypes,
  onActivityClick,
  onEmptySlotClick,
}: ChessViewProps) {
  // Получаем данные
  const { roomsWithActivities, isLoading, isToday: isTodayDate } = useRoomPlanner({
    date,
    roomIds,
    activityTypes,
  });

  // Временные слоты для отображения
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Позиция линии текущего времени (в процентах)
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);

  // Состояние выделения интервала
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Обработчик начала выделения
  const handleSelectionStart = (roomId: string, rowIndex: number) => {
    setIsSelecting(true);
    setSelection({ roomId, startRow: rowIndex, endRow: rowIndex });
  };

  // Обработчик движения выделения
  const handleSelectionMove = (rowIndex: number) => {
    if (isSelecting && selection) {
      setSelection({ ...selection, endRow: rowIndex });
    }
  };

  // Обработчик окончания выделения
  const handleSelectionEnd = () => {
    if (isSelecting && selection) {
      const minRow = Math.min(selection.startRow, selection.endRow);
      const maxRow = Math.max(selection.startRow, selection.endRow);

      const { startTime } = getTimeFromRowIndex(minRow);
      const { endTime } = getTimeFromRowIndex(maxRow);

      // Вызываем создание события с выбранным интервалом
      onEmptySlotClick(selection.roomId, startTime, endTime);
    }
    setIsSelecting(false);
    setSelection(null);
  };

  // Глобальный обработчик mouseup (на случай если мышь отпустили вне колонки)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        handleSelectionEnd();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, selection]);

  // Обновляем позицию линии текущего времени каждую минуту
  useEffect(() => {
    if (!isToday(date)) {
      setCurrentTimePosition(null);
      return;
    }

    const updatePosition = () => {
      setCurrentTimePosition(getCurrentTimePositionPercent());
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // каждую минуту

    return () => clearInterval(interval);
  }, [date]);

  // Загрузка
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  // Если нет помещений
  if (!roomsWithActivities.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Нет помещений для отображения
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-background overflow-hidden h-[calc(100vh-100px)] overflow-x-auto">
      <div className="flex flex-col h-full" style={{ minWidth: 'min-content' }}>
        {/* Заголовок с помещениями */}
        <div className="flex-shrink-0 flex border-b">
          {/* Пустая ячейка над колонкой времени */}
          <div
            className="flex-shrink-0 border-r bg-muted/30"
            style={{ width: TIME_COLUMN_WIDTH }}
          />
          {/* Заголовки помещений */}
          {roomsWithActivities.map((rwa) => (
            <div
              key={rwa.room.id}
              className="flex-1 border-r px-2 py-1 bg-muted/30"
              style={{ minWidth: MIN_ROOM_COLUMN_WIDTH }}
            >
              <div className="font-semibold text-xs truncate">
                {rwa.room.name}
                {rwa.room.number && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({rwa.room.number})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Основная сетка - растягивается на всю доступную высоту */}
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
                'flex-1 flex items-start justify-end pr-2 text-xs text-muted-foreground border-b min-h-0',
                index % 2 === 0 ? 'font-medium' : 'text-[10px] opacity-60'
              )}
            >
              <span className="-mt-1.5">{index % 2 === 0 ? formatTimeLabel(time) : ''}</span>
            </div>
          ))}
        </div>

        {/* Колонки помещений */}
        {roomsWithActivities.map((rwa) => (
          <RoomColumn
            key={rwa.room.id}
            roomWithActivities={rwa}
            date={date}
            isTodayDate={isTodayDate}
            timeSlots={timeSlots}
            onActivityClick={onActivityClick}
            onCreateEvent={onEmptySlotClick}
            currentTimePosition={currentTimePosition}
            selection={selection}
            onSelectionStart={handleSelectionStart}
            onSelectionMove={handleSelectionMove}
            onSelectionEnd={handleSelectionEnd}
          />
        ))}
        </div>
      </div>
    </div>
  );
}

// Компонент колонки помещения
interface RoomColumnProps {
  roomWithActivities: RoomWithActivities;
  date: string;
  isTodayDate: boolean;
  timeSlots: string[];
  onActivityClick: (activity: Activity) => void;
  onCreateEvent: (roomId: string, startTime: string, endTime: string) => void;
  currentTimePosition: number | null;
  selection: SelectionState | null;
  onSelectionStart: (roomId: string, rowIndex: number) => void;
  onSelectionMove: (rowIndex: number) => void;
  onSelectionEnd: () => void;
}

function RoomColumn({
  roomWithActivities,
  date,
  isTodayDate,
  timeSlots,
  onActivityClick,
  onCreateEvent,
  currentTimePosition,
  selection,
  onSelectionStart,
  onSelectionMove,
  onSelectionEnd,
}: RoomColumnProps) {
  const { room, activities } = roomWithActivities;

  // Проверяем, выделена ли ячейка
  const isCellSelected = (rowIndex: number) => {
    if (!selection || selection.roomId !== room.id) return false;
    const minRow = Math.min(selection.startRow, selection.endRow);
    const maxRow = Math.max(selection.startRow, selection.endRow);
    return rowIndex >= minRow && rowIndex <= maxRow;
  };

  // Обработчик mousedown на ячейке
  const handleMouseDown = (rowIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    onSelectionStart(room.id, rowIndex);
  };

  // Обработчик mousemove на ячейке
  const handleMouseEnter = (rowIndex: number) => {
    if (selection && selection.roomId === room.id) {
      onSelectionMove(rowIndex);
    }
  };

  return (
    <div
      className="flex-1 border-r relative flex flex-col select-none"
      style={{ minWidth: MIN_ROOM_COLUMN_WIDTH }}
      onMouseUp={onSelectionEnd}
      onMouseLeave={() => {
        // Не сбрасываем выделение при выходе за пределы колонки
      }}
    >
      {/* Фоновые ячейки (строки) - каждая занимает равную долю высоты */}
      {timeSlots.map((_, index) => (
        <div
          key={index}
          className={cn(
            'flex-1 border-b cursor-pointer transition-colors min-h-0',
            index % 2 === 0 ? 'bg-background' : 'bg-muted/20',
            isCellSelected(index) && 'bg-primary/20',
            !isCellSelected(index) && 'hover:bg-muted/50'
          )}
          onMouseDown={(e) => handleMouseDown(index, e)}
          onMouseEnter={() => handleMouseEnter(index)}
        />
      ))}

      {/* Карточки активностей (абсолютное позиционирование в процентах) */}
      {activities.map((activity) => {
        const position = getActivityPositionPercent(activity.startTime, activity.endTime);
        const isCurrentlyActive = isTodayDate && isActivityCurrentlyActive(
          activity.date,
          activity.startTime,
          activity.endTime,
          date
        );

        return (
          <ChessActivityCard
            key={activity.id}
            activity={activity}
            style={{ top: `${position.top}%`, height: `${position.height}%` }}
            onClick={() => onActivityClick(activity)}
            isCurrentlyActive={isCurrentlyActive}
          />
        );
      })}

      {/* Линия текущего времени */}
      {currentTimePosition !== null && (
        <div
          className="absolute left-0 right-0 z-10 pointer-events-none"
          style={{ top: `${currentTimePosition}%` }}
        >
          <div className="w-full h-0.5 bg-red-500" />
        </div>
      )}
    </div>
  );
}
