import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesApi, Schedule, CreateScheduleDto, UpdateScheduleDto, ScheduleFilters } from '@/lib/api/schedules';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateScheduleDto) => schedulesApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'Успешно',
        description: 'Занятие создано',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка создания занятия',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка обновления занятия',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => schedulesApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'Успешно',
        description: 'Занятие удалено',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка удаления занятия',
        variant: 'destructive',
      });
    },
  });
};
