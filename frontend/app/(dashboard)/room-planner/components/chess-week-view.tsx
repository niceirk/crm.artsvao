'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useWeekActivities, type Activity, type ActivityType } from '@/hooks/use-room-planner';
import { useRooms } from '@/hooks/use-rooms';
import { useRoomPlannerScaleStore } from '@/lib/stores/room-planner-scale-store';
import {
  ChessGridLayout,
  type ChessColumn,
  getActivityPositionPercent,
  getOverlappingCardStyle,
  CHESS_LAYOUT,
} from './chess-grid-layout';
import {
  CHESS_GRID,
  getTimeFromRowIndex,
  getDayName,
  getDayNumber,
  isCurrentWeek,
  layoutOverlappingEvents,
} from '@/lib/utils/chess-grid';
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

  // Получаем масштаб из store
  const scale = useRoomPlannerScaleStore((state) => state.scale);

  // Получаем список помещений для отображения названий
  const { data: rooms } = useRooms();
  const roomsMap = useMemo(() => {
    if (!rooms) return new Map<string, string>();
    return new Map(rooms.map((r) => [r.id, r.name]));
  }, [rooms]);

  // Позиция линии текущего времени (в процентах)
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);
  const [todayDate] = useState(getCurrentDate());

  // Текущая неделя?
  const isThisWeek = isCurrentWeek(weekStartDate);

  // Состояние выделения для каждого дня
  const [selection, setSelection] = useState<{ date: string; startRow: number; endRow: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Преобразуем дни недели в колонки для ChessGridLayout
  const columns: ChessColumn[] = useMemo(() => {
    return weekDates.map((date) => ({
      id: date,
      name: getDayName(date),
      subtext: getDayNumber(date).toString(),
      isHighlighted: date === todayDate,
    }));
  }, [weekDates, todayDate]);

  // Обработчик начала выделения
  const handleCellMouseDown = useCallback((columnId: string, rowIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    setIsSelecting(true);
    setSelection({ date: columnId, startRow: rowIndex, endRow: rowIndex });
  }, []);

  // Обработчик движения выделения
  const handleCellMouseEnter = useCallback((columnId: string, rowIndex: number) => {
    if (isSelecting && selection && selection.date === columnId) {
      setSelection({ ...selection, endRow: rowIndex });
    }
  }, [isSelecting, selection]);

  // Обработчик окончания выделения
  const handleCellMouseUp = useCallback(() => {
    if (isSelecting && selection) {
      const minRow = Math.min(selection.startRow, selection.endRow);
      const maxRow = Math.max(selection.startRow, selection.endRow);

      const { startTime } = getTimeFromRowIndex(minRow);
      const { endTime } = getTimeFromRowIndex(maxRow);

      onEmptySlotClick(selection.date, startTime, endTime);
    }
    setIsSelecting(false);
    setSelection(null);
  }, [isSelecting, selection, onEmptySlotClick]);

  // Проверка, выделена ли ячейка
  const isCellSelected = useCallback((columnId: string, rowIndex: number) => {
    if (!selection || selection.date !== columnId) return false;
    const minRow = Math.min(selection.startRow, selection.endRow);
    const maxRow = Math.max(selection.startRow, selection.endRow);
    return rowIndex >= minRow && rowIndex <= maxRow;
  }, [selection]);

  // Глобальный обработчик mouseup
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        handleCellMouseUp();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, handleCellMouseUp]);

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
    const interval = setInterval(updatePosition, 60000);

    return () => clearInterval(interval);
  }, [isThisWeek]);

  // Рендер заголовка колонки (дня недели)
  const renderColumnHeader = useCallback((column: ChessColumn) => {
    const isToday = column.id === todayDate;
    const applyScale = scale !== 1.0;
    const headerFontSize = applyScale ? `calc(0.75rem * ${scale})` : undefined;
    const dayNumberFontSize = applyScale ? `calc(0.875rem * ${scale})` : undefined;

    return (
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'text-xs font-medium',
            isToday ? 'text-primary' : 'text-muted-foreground'
          )}
          style={headerFontSize ? { fontSize: headerFontSize } : undefined}
        >
          {column.name}
        </span>
        <span
          className={cn(
            'text-sm font-semibold',
            isToday && 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center'
          )}
          style={dayNumberFontSize ? { fontSize: dayNumberFontSize } : undefined}
        >
          {column.subtext}
        </span>
      </div>
    );
  }, [todayDate, scale]);

  // Рендер контента колонки (карточки активностей)
  const renderColumnContent = useCallback((column: ChessColumn) => {
    const date = column.id;
    const activities = weekActivities[date] || [];
    const activitiesWithLayout = layoutOverlappingEvents(activities);
    const isToday = date === todayDate;

    return activitiesWithLayout.map((activity) => {
      const position = getActivityPositionPercent(activity.startTime, activity.endTime);
      const roomName = roomsMap.get(activity.roomId) || 'Помещение';

      return (
        <WeekActivityCard
          key={activity.id}
          activity={activity}
          style={getOverlappingCardStyle(
            position.top,
            position.height,
            activity.column,
            activity.totalColumns
          )}
          onClick={() => onActivityClick(activity)}
          roomName={roomName}
          scale={scale}
        />
      );
    });
  }, [weekActivities, todayDate, roomsMap, scale, onActivityClick]);

  // Загрузка
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  // Определяем, показывать ли линию времени только для сегодняшнего дня
  // Мы передадим currentTimePosition только когда isThisWeek === true
  // Линия отрисуется во всех колонках, но это нормально для недельного вида
  // (можно доработать, чтобы линия была только в колонке сегодняшнего дня)

  return (
    <TooltipProvider delayDuration={200}>
      <ChessGridLayout
        columns={columns}
        containerHeight="100%"
        scale={scale}
        onCellMouseDown={handleCellMouseDown}
        onCellMouseEnter={handleCellMouseEnter}
        onCellMouseUp={handleCellMouseUp}
        isCellSelected={isCellSelected}
        renderColumnHeader={renderColumnHeader}
        renderColumnContent={renderColumnContent}
        currentTimePosition={isThisWeek ? currentTimePosition : null}
      />
    </TooltipProvider>
  );
}

// Карточка активности для недельного вида
interface WeekActivityCardProps {
  activity: Activity & { column: number; totalColumns: number };
  style: React.CSSProperties;
  onClick: () => void;
  roomName: string;
  scale: number;
}

const WeekActivityCard = memo(function WeekActivityCard({ activity, style, onClick, roomName, scale }: WeekActivityCardProps) {
  const isCancelled = activity.status === 'CANCELLED';

  // Собираем полный текст
  const fullText = `${activity.startTime} ${activity.title}, ${roomName}`;
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
        >
          <p
            className="h-full px-1 py-0.5 leading-snug text-foreground overflow-hidden"
            style={{
              fontSize: `${11 * scale}px`,
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
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[250px]">
        <div className="space-y-1">
          <div className="font-semibold">{activity.title}</div>
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
});
