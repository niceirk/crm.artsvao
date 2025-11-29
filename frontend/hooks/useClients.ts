import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  searchClients,
  checkDuplicate,
  getClientRelations,
  createClientRelation,
  deleteClientRelation,
  updateClientRelation,
  uploadClientPhoto,
  deleteClientPhoto,
} from '@/lib/api/clients';
import type {
  ClientFilterParams,
  CreateClientDto,
  UpdateClientDto,
  CreateRelationDto,
  RelationType,
} from '@/lib/types/clients';
import { toast } from '@/lib/utils/toast';

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

  return useMutation({
    mutationFn: (data: CreateClientDto) => createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Клиент создан', {
        description: 'Новый клиент успешно добавлен в систему',
      });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
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

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientDto }) =>
      updateClient(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.id] });
      toast.success('Клиент обновлен', {
        description: 'Данные клиента успешно обновлены',
      });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
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

  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Клиент удален', {
        description: 'Клиент помечен как неактивный',
      });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
        description: error.response?.data?.message || 'Не удалось удалить клиента',
      });
    },
  });
};

/**
 * Hook для поиска клиентов с debounce
 */
export const useSearchClients = (query: string, delay: number = 500) => {
  const [debouncedQuery, setDebouncedQuery] = React.useState(query);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [query, delay]);

  return useQuery({
    queryKey: ['clients', 'search', debouncedQuery],
    queryFn: () => searchClients(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 минут
  });
};

/**
 * Hook для проверки дубликатов по телефону с debounce
 */
export const useCheckDuplicate = (
  phone: string,
  excludeId?: string,
  delay: number = 500
) => {
  const [debouncedPhone, setDebouncedPhone] = React.useState(phone);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPhone(phone);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [phone, delay]);

  return useQuery({
    queryKey: ['clients', 'check-duplicate', debouncedPhone, excludeId],
    queryFn: () => checkDuplicate(debouncedPhone, excludeId),
    enabled: debouncedPhone.length >= 10, // Минимум 10 цифр для телефона
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

  return useMutation({
    mutationFn: ({ clientId, data }: { clientId: string; data: CreateRelationDto }) =>
      createClientRelation(clientId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId, 'relations'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.data.relatedClientId, 'relations'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId] });
      toast.success('Связь создана', {
        description: 'Родственная связь успешно добавлена',
      });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
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

  return useMutation({
    mutationFn: ({ clientId, relationId }: { clientId: string; relationId: string }) =>
      deleteClientRelation(clientId, relationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId, 'relations'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId] });
      toast.success('Связь удалена', {
        description: 'Родственная связь успешно удалена',
      });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
        description: error.response?.data?.message || 'Не удалось удалить связь',
      });
    },
  });
};

/**
 * Hook для обновления типа родственной связи
 */
export const useUpdateClientRelation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      relationId,
      relationType,
    }: {
      clientId: string;
      relationId: string;
      relationType: RelationType;
    }) => updateClientRelation(clientId, relationId, { relationType }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId, 'relations'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId] });
      toast.success('Связь обновлена', {
        description: 'Тип родственной связи успешно изменён',
      });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
        description: error.response?.data?.message || 'Не удалось обновить связь',
      });
    },
  });
};

/**
 * Hook для загрузки фото клиента
 */
export const useUploadClientPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, file }: { clientId: string; file: File }) =>
      uploadClientPhoto(clientId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId] });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
        description: error.response?.data?.message || 'Не удалось загрузить фото',
      });
    },
  });
};

/**
 * Hook для удаления фото клиента
 */
export const useDeleteClientPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => deleteClientPhoto(clientId),
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', clientId] });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
        description: error.response?.data?.message || 'Не удалось удалить фото',
      });
    },
  });
};
