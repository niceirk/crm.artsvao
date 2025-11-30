import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi, SellSingleSessionDto } from '@/lib/api/subscriptions';
import type {
  SellSubscriptionDto,
  SellIndependentServiceDto,
  UpdateSubscriptionDto,
  SubscriptionFilterDto,
} from '@/lib/types/subscriptions';
import { toast } from 'sonner';

export const useSubscriptions = (filters?: SubscriptionFilterDto) => {
  return useQuery({
    queryKey: ['subscriptions', filters],
    queryFn: () => subscriptionsApi.getAll(filters),
    staleTime: 30 * 1000, // 30 секунд - данные считаются свежими
    refetchOnWindowFocus: false, // Не перезагружать при фокусе окна
  });
};

export const useSubscription = (id: string) => {
  return useQuery({
    queryKey: ['subscriptions', id],
    queryFn: () => subscriptionsApi.getById(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 минута - кэшируем детали подписки
    refetchOnWindowFocus: false, // Не перезагружать при фокусе
  });
};

export const useClientSubscriptions = (clientId: string) => {
  return useQuery({
    queryKey: ['subscriptions', 'client', clientId],
    queryFn: () => subscriptionsApi.getAll({ clientId }),
    enabled: !!clientId,
  });
};

export const useSellSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SellSubscriptionDto) => subscriptionsApi.sell(data),
    onSuccess: (subscription) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({
        queryKey: ['subscriptions', 'client', subscription.clientId]
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Абонемент успешно продан');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка продажи абонемента');
    },
  });
};

export const useSellSingleSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SellSingleSessionDto) => subscriptionsApi.sellSingleSession(data),
    onSuccess: (subscription) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({
        queryKey: ['subscriptions', 'client', subscription.clientId]
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-bases'] });
      const quantity = subscription.remainingVisits ?? 1;
      toast.success(quantity === 1 ? 'Разовое посещение продано' : `Продано ${quantity} разовых посещений`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка продажи');
    },
  });
};

export const useSellService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SellIndependentServiceDto) => subscriptionsApi.sellService(data),
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ['service-sales'] });
      queryClient.invalidateQueries({
        queryKey: ['service-sales', 'client', sale.clientId]
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Услуга успешно продана');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка продажи услуги');
    },
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubscriptionDto }) =>
      subscriptionsApi.update(id, data),
    onSuccess: (subscription) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', subscription.id] });
      queryClient.invalidateQueries({
        queryKey: ['subscriptions', 'client', subscription.clientId]
      });
      toast.success('Абонемент обновлен');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления абонемента');
    },
  });
};

export const useValidateSubscription = (id: string, date?: string) => {
  return useQuery({
    queryKey: ['subscriptions', id, 'validate', date],
    queryFn: () => subscriptionsApi.validate(id, date),
    enabled: !!id,
  });
};

export const useCanDeleteSubscription = (id: string | null) => {
  return useQuery({
    queryKey: ['subscriptions', id, 'can-delete'],
    queryFn: () => subscriptionsApi.canDelete(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 минут - кэшируем результат
    gcTime: 10 * 60 * 1000, // 10 минут - храним в памяти
    refetchOnWindowFocus: false, // Не перезагружать при фокусе
    refetchOnMount: false, // Не перезагружать при монтировании если есть кэш
  });
};

export const useDeleteSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => subscriptionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Абонемент удалён');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при удалении абонемента');
    },
  });
};
