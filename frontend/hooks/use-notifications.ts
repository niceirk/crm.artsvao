import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as notificationsApi from '@/lib/api/notifications';
import type {
  NotificationQuery,
  TemplateQuery,
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateNotificationDto,
  MassSendDto,
} from '@/lib/types/notifications';
import { toast } from '@/lib/utils/toast';

// ============================
// УВЕДОМЛЕНИЯ
// ============================

export const useNotifications = (params?: NotificationQuery) => {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsApi.getNotifications(params),
  });
};

export const useNotification = (id: string) => {
  return useQuery({
    queryKey: ['notifications', id],
    queryFn: () => notificationsApi.getNotification(id),
    enabled: !!id,
  });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateNotificationDto) =>
      notificationsApi.createNotification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Уведомление создано');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Ошибка создания уведомления'
      );
    },
  });
};

export const useCancelNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.cancelNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Уведомление отменено');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка отмены уведомления');
    },
  });
};

export const useRetryNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.retryNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Уведомление поставлено в очередь повторно');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Ошибка повторной отправки'
      );
    },
  });
};

export const useNotificationStats = (dateFrom?: string, dateTo?: string) => {
  return useQuery({
    queryKey: ['notification-stats', dateFrom, dateTo],
    queryFn: () => notificationsApi.getNotificationStats(dateFrom, dateTo),
  });
};

export const useQueueStats = () => {
  return useQuery({
    queryKey: ['queue-stats'],
    queryFn: notificationsApi.getQueueStats,
    refetchInterval: 5000, // Обновляем каждые 5 секунд
  });
};

// ============================
// МАССОВЫЕ РАССЫЛКИ
// ============================

export const useCreateMassSend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MassSendDto) => notificationsApi.createMassSend(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
      toast.success(
        `Рассылка создана: ${result.queued} в очереди, ${result.skipped} пропущено${result.testMode ? ' (тестовый режим)' : ''}`
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания рассылки');
    },
  });
};

// ============================
// ШАБЛОНЫ
// ============================

export const useTemplates = (params?: TemplateQuery) => {
  return useQuery({
    queryKey: ['notification-templates', params],
    queryFn: () => notificationsApi.getTemplates(params),
  });
};

export const useTemplate = (id: string) => {
  return useQuery({
    queryKey: ['notification-templates', id],
    queryFn: () => notificationsApi.getTemplate(id),
    enabled: !!id,
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplateDto) =>
      notificationsApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Шаблон создан');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания шаблона');
    },
  });
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateDto }) =>
      notificationsApi.updateTemplate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      queryClient.invalidateQueries({
        queryKey: ['notification-templates', variables.id],
      });
      toast.success('Шаблон обновлён');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления шаблона');
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Шаблон удалён');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления шаблона');
    },
  });
};

export const usePreviewTemplate = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      notificationsApi.previewTemplate(id, data),
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Ошибка предпросмотра шаблона'
      );
    },
  });
};
