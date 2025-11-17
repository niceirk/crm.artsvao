import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import type {
  SellSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionFilterDto,
} from '@/lib/types/subscriptions';
import { toast } from 'sonner';

export const useSubscriptions = (filters?: SubscriptionFilterDto) => {
  return useQuery({
    queryKey: ['subscriptions', filters],
    queryFn: () => subscriptionsApi.getAll(filters),
  });
};

export const useSubscription = (id: string) => {
  return useQuery({
    queryKey: ['subscriptions', id],
    queryFn: () => subscriptionsApi.getById(id),
    enabled: !!id,
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
