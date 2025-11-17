import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionTypesApi } from '@/lib/api/subscriptions';
import type {
  CreateSubscriptionTypeDto,
  UpdateSubscriptionTypeDto,
  SubscriptionTypeFilterDto,
} from '@/lib/types/subscriptions';
import { toast } from 'sonner';

export const useSubscriptionTypes = (filters?: SubscriptionTypeFilterDto) => {
  return useQuery({
    queryKey: ['subscription-types', filters],
    queryFn: () => subscriptionTypesApi.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 минут для справочников
  });
};

export const useActiveSubscriptionTypes = () => {
  return useQuery({
    queryKey: ['subscription-types', 'active'],
    queryFn: () => subscriptionTypesApi.getAll({ isActive: true }),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSubscriptionTypesByGroup = (groupId: string) => {
  return useQuery({
    queryKey: ['subscription-types', 'group', groupId],
    queryFn: () => subscriptionTypesApi.getByGroup(groupId),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSubscriptionType = (id: string) => {
  return useQuery({
    queryKey: ['subscription-types', id],
    queryFn: () => subscriptionTypesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateSubscriptionType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubscriptionTypeDto) =>
      subscriptionTypesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-types'] });
      toast.success('Тип абонемента создан');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания типа абонемента');
    },
  });
};

export const useUpdateSubscriptionType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubscriptionTypeDto }) =>
      subscriptionTypesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subscription-types'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-types', variables.id] });
      toast.success('Тип абонемента обновлен');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления типа абонемента');
    },
  });
};

export const useDeleteSubscriptionType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => subscriptionTypesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-types'] });
      toast.success('Тип абонемента удален');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления типа абонемента');
    },
  });
};
