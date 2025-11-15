import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLeadSources,
  getActiveLeadSources,
  getLeadSource,
  createLeadSource,
  updateLeadSource,
  deleteLeadSource,
} from '@/lib/api/lead-sources';
import type { CreateLeadSourceDto, UpdateLeadSourceDto } from '@/lib/types/lead-sources';
import { useToast } from './use-toast';

/**
 * Hook для получения всех источников привлечения
 */
export const useLeadSources = () => {
  return useQuery({
    queryKey: ['lead-sources'],
    queryFn: getLeadSources,
  });
};

/**
 * Hook для получения активных источников привлечения
 */
export const useActiveLeadSources = () => {
  return useQuery({
    queryKey: ['lead-sources', 'active'],
    queryFn: getActiveLeadSources,
  });
};

/**
 * Hook для получения одного источника привлечения
 */
export const useLeadSource = (id: string) => {
  return useQuery({
    queryKey: ['lead-sources', id],
    queryFn: () => getLeadSource(id),
    enabled: !!id,
  });
};

/**
 * Hook для создания источника привлечения
 */
export const useCreateLeadSource = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateLeadSourceDto) => createLeadSource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
      toast({
        title: 'Источник создан',
        description: 'Новый источник привлечения успешно добавлен',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.response?.data?.message || 'Не удалось создать источник',
      });
    },
  });
};

/**
 * Hook для обновления источника привлечения
 */
export const useUpdateLeadSource = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadSourceDto }) =>
      updateLeadSource(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
      queryClient.invalidateQueries({ queryKey: ['lead-sources', variables.id] });
      toast({
        title: 'Источник обновлен',
        description: 'Данные источника успешно обновлены',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.response?.data?.message || 'Не удалось обновить источник',
      });
    },
  });
};

/**
 * Hook для удаления источника привлечения
 */
export const useDeleteLeadSource = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteLeadSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
      toast({
        title: 'Источник удален',
        description: 'Источник привлечения успешно удален',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.response?.data?.message || 'Не удалось удалить источник',
      });
    },
  });
};
