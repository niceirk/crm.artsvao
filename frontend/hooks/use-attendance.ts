import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api/attendance';
import type {
  CreateAttendanceDto,
  UpdateAttendanceDto,
  AttendanceFilterDto,
} from '@/lib/types/attendance';
import { toast } from 'sonner';

/**
 * Получить список посещений с фильтрацией
 */
export const useAttendances = (filters?: AttendanceFilterDto) => {
  return useQuery({
    queryKey: ['attendances', filters],
    queryFn: () => attendanceApi.getAll(filters),
  });
};

/**
 * Получить журнал посещаемости по конкретному занятию
 */
export const useAttendanceBySchedule = (scheduleId: string) => {
  return useQuery({
    queryKey: ['attendances', 'schedule', scheduleId],
    queryFn: () => attendanceApi.getBySchedule(scheduleId),
    enabled: !!scheduleId,
  });
};

/**
 * Получить статистику посещаемости клиента
 */
export const useAttendanceStats = (
  clientId: string,
  from?: string,
  to?: string,
) => {
  return useQuery({
    queryKey: ['attendances', 'stats', clientId, from, to],
    queryFn: () => attendanceApi.getClientStats(clientId, from, to),
    enabled: !!clientId,
  });
};

/**
 * Получить одну запись посещения
 */
export const useAttendance = (id: string) => {
  return useQuery({
    queryKey: ['attendances', id],
    queryFn: () => attendanceApi.getById(id),
    enabled: !!id,
  });
};

/**
 * Отметить посещение
 */
export const useMarkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAttendanceDto) => attendanceApi.mark(data),
    onSuccess: (attendance) => {
      // Инвалидация всех связанных запросов
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({
        queryKey: ['attendances', 'schedule', attendance.scheduleId],
      });
      queryClient.invalidateQueries({
        queryKey: ['attendances', 'stats', attendance.clientId],
      });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({
        queryKey: ['subscriptions', 'client', attendance.clientId],
      });
      toast.success('Посещение отмечено');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Ошибка отметки посещения',
      );
    },
  });
};

/**
 * Обновить статус посещения
 */
export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAttendanceDto }) =>
      attendanceApi.update(id, data),
    onSuccess: (attendance) => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances', attendance.id] });
      queryClient.invalidateQueries({
        queryKey: ['attendances', 'schedule', attendance.scheduleId],
      });
      queryClient.invalidateQueries({
        queryKey: ['attendances', 'stats', attendance.clientId],
      });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({
        queryKey: ['subscriptions', 'client', attendance.clientId],
      });
      toast.success('Посещение обновлено');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Ошибка обновления посещения',
      );
    },
  });
};

/**
 * Удалить запись посещения (только ADMIN)
 */
export const useDeleteAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => attendanceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Посещение удалено');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Ошибка удаления посещения',
      );
    },
  });
};
