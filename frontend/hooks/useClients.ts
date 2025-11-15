import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  searchClients,
  getClientRelations,
  createClientRelation,
  deleteClientRelation,
} from '@/lib/api/clients';
import type {
  ClientFilterParams,
  CreateClientDto,
  UpdateClientDto,
  CreateRelationDto,
} from '@/lib/types/clients';
import { useToast } from './use-toast';

/**
 * Hook для получения списка клиентов с фильтрацией
 */
export const useClients = (params?: ClientFilterParams) => {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => getClients(params),
  });
};

/**
 * Hook для получения одного клиента
 */
export const useClient = (id: string) => {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => getClient(id),
    enabled: !!id,
  });
};

/**
 * Hook для создания клиента
 */
export const useCreateClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateClientDto) => createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Клиент создан',
        description: 'Новый клиент успешно добавлен в систему',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.response?.data?.message || 'Не удалось создать клиента',
      });
    },
  });
};

/**
 * Hook для обновления клиента
 */
export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientDto }) =>
      updateClient(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.id] });
      toast({
        title: 'Клиент обновлен',
        description: 'Данные клиента успешно обновлены',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.response?.data?.message || 'Не удалось обновить клиента',
      });
    },
  });
};

/**
 * Hook для удаления клиента
 */
export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Клиент удален',
        description: 'Клиент помечен как неактивный',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.response?.data?.message || 'Не удалось удалить клиента',
      });
    },
  });
};

/**
 * Hook для поиска клиентов
 */
export const useSearchClients = (query: string) => {
  return useQuery({
    queryKey: ['clients', 'search', query],
    queryFn: () => searchClients(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60, // 1 минута
  });
};

/**
 * Hook для получения родственных связей клиента
 */
export const useClientRelations = (clientId: string) => {
  return useQuery({
    queryKey: ['clients', clientId, 'relations'],
    queryFn: () => getClientRelations(clientId),
    enabled: !!clientId,
  });
};

/**
 * Hook для создания родственной связи
 */
export const useCreateClientRelation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, data }: { clientId: string; data: CreateRelationDto }) =>
      createClientRelation(clientId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId, 'relations'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.data.relatedClientId, 'relations'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId] });
      toast({
        title: 'Связь создана',
        description: 'Родственная связь успешно добавлена',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.response?.data?.message || 'Не удалось создать связь',
      });
    },
  });
};

/**
 * Hook для удаления родственной связи
 */
export const useDeleteClientRelation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, relationId }: { clientId: string; relationId: string }) =>
      deleteClientRelation(clientId, relationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId, 'relations'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId] });
      toast({
        title: 'Связь удалена',
        description: 'Родственная связь успешно удалена',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.response?.data?.message || 'Не удалось удалить связь',
      });
    },
  });
};
