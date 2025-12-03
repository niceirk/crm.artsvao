'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspacesApi, Workspace, CreateWorkspaceDto, UpdateWorkspaceDto, WorkspaceAvailability } from '@/lib/api/workspaces';
import { toast } from 'sonner';

export function useWorkspaces(roomId?: string) {
  return useQuery<Workspace[]>({
    queryKey: ['workspaces', roomId],
    queryFn: () => workspacesApi.getAll(roomId),
  });
}

export function useWorkspace(id: string | undefined) {
  return useQuery<Workspace>({
    queryKey: ['workspaces', 'detail', id],
    queryFn: () => workspacesApi.getOne(id!),
    enabled: !!id,
  });
}

export function useWorkspaceAvailability(id: string | undefined, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['workspaces', 'availability', id, startDate, endDate],
    queryFn: () => workspacesApi.getAvailability(id!, startDate, endDate),
    enabled: !!id && !!startDate && !!endDate,
  });
}

// Хук для загрузки доступности нескольких workspaces (оптимизированный - один batch запрос)
export function useWorkspacesAvailability(
  workspaces: Workspace[],
  startDate: string,
  endDate: string
) {
  const workspaceIds = useMemo(() => workspaces.map(ws => ws.id), [workspaces]);

  const query = useQuery({
    queryKey: ['workspaces', 'batch-availability', workspaceIds.sort().join(','), startDate, endDate],
    queryFn: () => workspacesApi.getBatchAvailability(workspaceIds, startDate, endDate),
    enabled: workspaces.length > 0 && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 2,
  });

  // Создаем Map: workspaceId -> occupiedDates[]
  // Новый формат данных: { workspaceId: { date: OccupancyInfo } }
  // Преобразуем в массив дат для обратной совместимости
  const availabilityMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (query.data) {
      Object.entries(query.data).forEach(([id, dateOccupancyMap]) => {
        // dateOccupancyMap - это объект { date: OccupancyInfo }
        // Извлекаем ключи (даты) и сортируем
        const occupiedDates = Object.keys(dateOccupancyMap).sort();
        map.set(id, occupiedDates);
      });
    }
    return map;
  }, [query.data]);

  return {
    availabilityMap,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceDto) => workspacesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Рабочее место создано');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания рабочего места');
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceDto }) =>
      workspacesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'detail', variables.id] });
      toast.success('Рабочее место обновлено');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления рабочего места');
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspacesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Рабочее место удалено');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления рабочего места');
    },
  });
}
