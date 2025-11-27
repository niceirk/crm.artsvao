import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  schedulesApi,
  Schedule,
  CreateScheduleDto,
  UpdateScheduleDto,
  ScheduleFilters,
  CreateRecurringScheduleDto,
  BulkUpdateScheduleDto,
  CopyScheduleDto,
  BulkCancelScheduleDto,
  BulkDeleteScheduleDto,
} from '@/lib/api/schedules';
import { toast } from '@/lib/utils/toast';

export const useSchedules = (filters?: ScheduleFilters) => {
  return useQuery({
    queryKey: ['schedules', filters],
    queryFn: () => schedulesApi.getSchedules(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useSchedule = (id: string) => {
  return useQuery({
    queryKey: ['schedules', id],
    queryFn: () => schedulesApi.getSchedule(id),
    enabled: !!id,
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScheduleDto) => schedulesApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Занятие создано');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания занятия');
    },
  });
};

export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleDto }) =>
      schedulesApi.updateSchedule(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['schedules'] });

      // Snapshot the previous value
      const previousSchedules = queryClient.getQueriesData({ queryKey: ['schedules'] });

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ['schedules'] }, (old: any) => {
        if (!old) return old;
        return old.map((schedule: Schedule) =>
          schedule.id === id ? { ...schedule, ...data } : schedule
        );
      });

      // Return a context object with the snapshotted value
      return { previousSchedules };
    },
    onError: (error: any, _, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousSchedules) {
        context.previousSchedules.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.response?.data?.message || 'Ошибка обновления занятия');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => schedulesApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Занятие удалено');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления занятия');
    },
  });
};

export const useCreateRecurringSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRecurringScheduleDto) => schedulesApi.createRecurring(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success(`Создано занятий: ${result.created.count}, пропущено: ${result.skipped.count}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания повторяющихся занятий');
    },
  });
};

export const useBulkUpdateSchedules = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateScheduleDto) => schedulesApi.bulkUpdate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success(`Обновлено занятий: ${result.updated.count}, ошибок: ${result.failed.count}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка массового обновления');
    },
  });
};

export const useCopySchedules = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CopyScheduleDto) => schedulesApi.copySchedules(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success(`Скопировано занятий: ${result.created.count}, пропущено: ${result.skipped.count}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка копирования занятий');
    },
  });
};

export const useBulkCancelSchedules = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkCancelScheduleDto) => schedulesApi.bulkCancel(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      const message = result.transferred
        ? `Отменено: ${result.cancelled.count}, перенесено: ${result.transferred.count}`
        : `Отменено занятий: ${result.cancelled.count}`;
      toast.success(message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка отмены занятий');
    },
  });
};

export const useBulkDeleteSchedules = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkDeleteScheduleDto) => schedulesApi.bulkDelete(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      const message = result.totalCancelledEnrollments > 0
        ? `Удалено занятий: ${result.deleted.count}, отменено записей: ${result.totalCancelledEnrollments}. Занятия возвращены в абонементы клиентов.`
        : `Удалено занятий: ${result.deleted.count}`;
      toast.success(message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления занятий');
    },
  });
};
