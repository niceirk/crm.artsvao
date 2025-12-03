'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRoomPlanner, type Activity, type RoomWithActivities, type ActivityType } from '@/hooks/use-room-planner';
import { useCoworkingWorkspaces, type CoworkingWorkspaceStatus } from '@/hooks/use-coworking-workspaces';
import { ChessActivityCard } from './chess-activity-card';
import { ChessCoworkingCard } from './chess-coworking-card';
import { WorkspaceBookingSheet } from './workspace-booking-sheet';
import {
  ChessGridLayout,
  type ChessColumn,
  getActivityPositionPercent,
  getSimpleCardStyle,
} from './chess-grid-layout';
import {
  CHESS_GRID,
  getTimeFromRowIndex,
  isToday,
} from '@/lib/utils/chess-grid';
import { isActivityCurrentlyActive } from '@/lib/utils/time-slots';
import { useRoomPlannerScaleStore } from '@/lib/stores/room-planner-scale-store';
import { useRoomPlannerSortStore } from '@/lib/stores/room-planner-sort-store';
import type { Room } from '@/lib/api/rooms';

interface ChessViewProps {
  date: string;
  roomIds?: string[];
  activityTypes?: ActivityType[];
  onActivityClick: (activity: Activity) => void;
  onEmptySlotClick: (roomId: string, startTime: string, endTime: string) => void;
}

// Состояние выделения
interface SelectionState {
  roomId: string;
  startRow: number;
  endRow: number;
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
  // Получаем масштаб и режим сортировки из stores
  const scale = useRoomPlannerScaleStore((state) => state.scale);
  const sortByIndex = useRoomPlannerSortStore((state) => state.sortByIndex);

  // Получаем данные
  const { roomsWithActivities, isLoading, isToday: isTodayDate } = useRoomPlanner({
    date,
    roomIds,
    activityTypes,
    sortByIndex,
  });

  // Получаем ID коворкинг-помещений
  const coworkingRoomIds = useMemo(() => {
    return roomsWithActivities
      .filter((rwa) => rwa.room.isCoworking)
      .map((rwa) => rwa.room.id);
  }, [roomsWithActivities]);

  // Загружаем рабочие места для коворкингов
  const { coworkingMap, isLoading: isLoadingCoworking } = useCoworkingWorkspaces(
    coworkingRoomIds,
    date
  );

  // Создаём map комнат для быстрого доступа
  const roomsMap = useMemo(() => {
    const map = new Map<string, Room>();
    roomsWithActivities.forEach((rwa) => {
      map.set(rwa.room.id, rwa.room);
    });
    return map;
  }, [roomsWithActivities]);

  // Состояние для Sheet бронирования рабочего места
  const [selectedWorkspaceData, setSelectedWorkspaceData] = useState<{
    workspace: CoworkingWorkspaceStatus;
    room: Room;
  } | null>(null);
  const [isWorkspaceSheetOpen, setIsWorkspaceSheetOpen] = useState(false);

  // Позиция линии текущего времени (в процентах)
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);

  // Состояние выделения интервала
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Преобразуем помещения в колонки для ChessGridLayout
  const columns: ChessColumn[] = useMemo(() => {
    return roomsWithActivities.map((rwa) => ({
      id: rwa.room.id,
      name: rwa.room.name,
      subtext: rwa.room.number || undefined,
    }));
  }, [roomsWithActivities]);

  // Создаем map для быстрого доступа к активностям по roomId
  const activitiesByRoom = useMemo(() => {
    const map = new Map<string, Activity[]>();
    roomsWithActivities.forEach((rwa) => {
      map.set(rwa.room.id, rwa.activities);
    });
    return map;
  }, [roomsWithActivities]);

  // Обработчик начала выделения
  const handleCellMouseDown = useCallback((columnId: string, rowIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    setIsSelecting(true);
    setSelection({ roomId: columnId, startRow: rowIndex, endRow: rowIndex });
  }, []);

  // Обработчик движения выделения
  const handleCellMouseEnter = useCallback((columnId: string, rowIndex: number) => {
    if (isSelecting && selection && selection.roomId === columnId) {
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

      // Вызываем создание события с выбранным интервалом
      onEmptySlotClick(selection.roomId, startTime, endTime);
    }
    setIsSelecting(false);
    setSelection(null);
  }, [isSelecting, selection, onEmptySlotClick]);

  // Проверка, выделена ли ячейка
  const isCellSelected = useCallback((columnId: string, rowIndex: number) => {
    if (!selection || selection.roomId !== columnId) return false;
    const minRow = Math.min(selection.startRow, selection.endRow);
    const maxRow = Math.max(selection.startRow, selection.endRow);
    return rowIndex >= minRow && rowIndex <= maxRow;
  }, [selection]);

  // Глобальный обработчик mouseup (на случай если мышь отпустили вне колонки)
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

  // Обработчик клика по рабочему месту
  const handleWorkspaceClick = useCallback(
    (workspace: CoworkingWorkspaceStatus, room: Room) => {
      setSelectedWorkspaceData({ workspace, room });
      setIsWorkspaceSheetOpen(true);
    },
    []
  );

  // Рендер контента колонки (карточки активностей или коворкинг)
  const renderColumnContent = useCallback((column: ChessColumn) => {
    const room = roomsMap.get(column.id);
    const activities = activitiesByRoom.get(column.id) || [];

    // Для коворкинга С рабочими местами - специальный рендеринг
    if (room?.isCoworking) {
      // Показываем спиннер только пока идёт загрузка
      if (isLoadingCoworking) {
        return (
          <div className="absolute inset-2 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        );
      }

      const coworkingStatus = coworkingMap.get(room.id);

      // Если рабочих мест нет - показываем обычные активности (как для обычных помещений)
      // Это позволяет создавать брони для коворкинга без рабочих мест
      if (!coworkingStatus || coworkingStatus.totalWorkspaces === 0) {
        // Рендерим как обычное помещение - с активностями
        return activities.map((activity) => {
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
              style={getSimpleCardStyle(position.top, position.height)}
              onClick={() => onActivityClick(activity)}
              isCurrentlyActive={isCurrentlyActive}
              scale={scale}
            />
          );
        });
      }

      // Коворкинг с рабочими местами - специальная карточка
      return (
        <ChessCoworkingCard
          coworkingStatus={coworkingStatus}
          onWorkspaceClick={(ws) => handleWorkspaceClick(ws, room)}
          scale={scale}
        />
      );
    }

    // Для обычных помещений - существующая логика
    return activities.map((activity) => {
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
          style={getSimpleCardStyle(position.top, position.height)}
          onClick={() => onActivityClick(activity)}
          isCurrentlyActive={isCurrentlyActive}
          scale={scale}
        />
      );
    });
  }, [roomsMap, coworkingMap, isLoadingCoworking, handleWorkspaceClick, activitiesByRoom, isTodayDate, date, onActivityClick, scale]);

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
    <>
      <TooltipProvider delayDuration={200}>
        <ChessGridLayout
          columns={columns}
          containerHeight="calc(100vh - 70px)"
          scale={scale}
          onCellMouseDown={handleCellMouseDown}
          onCellMouseEnter={handleCellMouseEnter}
          onCellMouseUp={handleCellMouseUp}
          isCellSelected={isCellSelected}
          renderColumnContent={renderColumnContent}
          currentTimePosition={currentTimePosition}
        />
      </TooltipProvider>

      <WorkspaceBookingSheet
        open={isWorkspaceSheetOpen}
        onOpenChange={setIsWorkspaceSheetOpen}
        workspace={selectedWorkspaceData?.workspace ?? null}
        room={selectedWorkspaceData?.room ?? null}
        date={date}
      />
    </>
  );
}
