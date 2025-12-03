import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workspacesApi, type Workspace, type OccupancyInfo } from '@/lib/api/workspaces';

export interface CoworkingWorkspaceStatus {
  workspaceId: string;
  workspaceName: string;
  workspaceNumber?: string;
  baseStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  isOccupiedOnDate: boolean;
  dailyRate: number;
  monthlyRate: number;
  weeklyRate?: number;
  // Информация о заявке, если рабочее место занято
  occupancyInfo?: OccupancyInfo;
}

export interface CoworkingRoomStatus {
  roomId: string;
  workspaces: CoworkingWorkspaceStatus[];
  totalWorkspaces: number;
  availableOnDate: number;
  occupiedOnDate: number;
}

/**
 * Хук для получения рабочих мест коворкингов с их статусом занятости на дату
 */
export function useCoworkingWorkspaces(
  coworkingRoomIds: string[],
  date: string
): {
  coworkingMap: Map<string, CoworkingRoomStatus>;
  isLoading: boolean;
  error: Error | null;
} {
  // Загружаем рабочие места для всех коворкинг-помещений
  const {
    data: workspaces,
    isLoading: isLoadingWorkspaces,
    error: workspacesError,
  } = useQuery({
    queryKey: ['workspaces', 'by-rooms', coworkingRoomIds],
    queryFn: () => workspacesApi.getByRoomIds(coworkingRoomIds),
    enabled: coworkingRoomIds.length > 0,
    staleTime: 30000, // 30 секунд
  });

  // Получаем ID всех рабочих мест
  const workspaceIds = useMemo(() => {
    return workspaces?.map((ws) => ws.id) || [];
  }, [workspaces]);

  // Загружаем занятость для всех рабочих мест на выбранную дату
  const {
    data: availability,
    isLoading: isLoadingAvailability,
    error: availabilityError,
  } = useQuery({
    queryKey: ['workspaces', 'batch-availability', workspaceIds, date],
    queryFn: () => workspacesApi.getBatchAvailability(workspaceIds, date, date),
    enabled: workspaceIds.length > 0,
    staleTime: 30000,
  });

  // Объединяем данные в Map<roomId, CoworkingRoomStatus>
  const coworkingMap = useMemo(() => {
    const map = new Map<string, CoworkingRoomStatus>();

    if (!workspaces || workspaces.length === 0) {
      return map;
    }

    // Группируем рабочие места по помещениям
    const workspacesByRoom = new Map<string, Workspace[]>();
    for (const ws of workspaces) {
      const roomWorkspaces = workspacesByRoom.get(ws.roomId) || [];
      roomWorkspaces.push(ws);
      workspacesByRoom.set(ws.roomId, roomWorkspaces);
    }

    // Формируем статус для каждого помещения
    Array.from(workspacesByRoom.entries()).forEach(([roomId, roomWorkspaces]) => {
      const workspaceStatuses: CoworkingWorkspaceStatus[] = roomWorkspaces.map((ws: Workspace) => {
        // Новый формат: availability[wsId] - это объект { date: OccupancyInfo }
        const occupancyByDate = availability?.[ws.id] || {};
        const occupancyInfo = occupancyByDate[date];
        const isOccupiedOnDate = !!occupancyInfo;

        return {
          workspaceId: ws.id,
          workspaceName: ws.name,
          workspaceNumber: ws.number,
          baseStatus: ws.status,
          isOccupiedOnDate,
          dailyRate: ws.dailyRate,
          monthlyRate: ws.monthlyRate,
          weeklyRate: ws.weeklyRate,
          occupancyInfo,
        };
      });

      const availableCount = workspaceStatuses.filter(
        (ws) => ws.baseStatus !== 'MAINTENANCE' && !ws.isOccupiedOnDate
      ).length;

      const occupiedCount = workspaceStatuses.filter(
        (ws) => ws.baseStatus !== 'MAINTENANCE' && ws.isOccupiedOnDate
      ).length;

      map.set(roomId, {
        roomId,
        workspaces: workspaceStatuses,
        totalWorkspaces: workspaceStatuses.length,
        availableOnDate: availableCount,
        occupiedOnDate: occupiedCount,
      });
    });

    return map;
  }, [workspaces, availability, date]);

  // isLoading: true пока грузятся workspaces, или пока грузится availability (если есть workspaces)
  const isLoading = isLoadingWorkspaces || (workspaceIds.length > 0 && isLoadingAvailability);

  return {
    coworkingMap,
    isLoading,
    error: workspacesError || availabilityError || null,
  };
}
