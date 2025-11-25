import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetsApi } from '@/lib/api/timesheets';
import type { TimesheetFilterDto, UpdateCompensationDto } from '@/lib/types/timesheets';

export const timesheetKeys = {
  all: ['timesheets'] as const,
  timesheet: (filter: TimesheetFilterDto) => [...timesheetKeys.all, 'timesheet', filter] as const,
  studios: () => [...timesheetKeys.all, 'studios'] as const,
  groups: (studioId?: string) => [...timesheetKeys.all, 'groups', studioId] as const,
};

/**
 * Получить табель посещаемости для группы за месяц
 */
export function useTimesheet(filter: TimesheetFilterDto) {
  return useQuery({
    queryKey: timesheetKeys.timesheet(filter),
    queryFn: () => timesheetsApi.getTimesheet(filter),
    enabled: !!filter.groupId,
    staleTime: 30000, // 30 секунд
  });
}

/**
 * Получить список студий для фильтра
 */
export function useTimesheetStudios() {
  return useQuery({
    queryKey: timesheetKeys.studios(),
    queryFn: () => timesheetsApi.getStudios(),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

/**
 * Получить список групп для фильтра
 */
export function useTimesheetGroups(studioId?: string) {
  return useQuery({
    queryKey: timesheetKeys.groups(studioId),
    queryFn: () => timesheetsApi.getGroups(studioId),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

/**
 * Обновить компенсацию (ручная корректировка)
 */
export function useUpdateCompensation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompensationDto }) =>
      timesheetsApi.updateCompensation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
    },
  });
}
