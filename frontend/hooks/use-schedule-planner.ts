import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  schedulesApi,
  PreviewRecurringScheduleDto,
  BulkCreateRecurringDto,
  PlannedSchedulesQuery,
} from '@/lib/api/schedules';
import { toast } from '@/lib/utils/toast';

/**
 * Hook для preview создания расписания
 */
export const useSchedulePreview = () => {
  return useMutation({
    mutationFn: (data: PreviewRecurringScheduleDto) => schedulesApi.previewRecurring(data),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка формирования предпросмотра');
    },
  });
};

/**
 * Hook для массового создания занятий из preview
 */
export const useBulkCreateRecurring = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkCreateRecurringDto) => schedulesApi.bulkCreateRecurring(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['planned-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['planned-months-stats'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });

      const message = result.failed.count > 0
        ? `Создано занятий: ${result.created.count}, ошибок: ${result.failed.count}`
        : `Создано занятий: ${result.created.count}`;
      toast.success(message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания занятий');
    },
  });
};

/**
 * Hook для получения запланированных занятий
 */
export const usePlannedSchedules = (params: PlannedSchedulesQuery) => {
  return useQuery({
    queryKey: ['planned-schedules', params],
    queryFn: () => schedulesApi.getPlannedSchedules(params),
    staleTime: 30 * 1000,
  });
};

/**
 * Hook для получения статистики по месяцам с запланированными занятиями
 */
export const usePlannedMonthsStats = (groupIds?: string[]) => {
  return useQuery({
    queryKey: ['planned-months-stats', groupIds],
    queryFn: () => schedulesApi.getPlannedMonthsStats(groupIds),
    staleTime: 60 * 1000,
  });
};
