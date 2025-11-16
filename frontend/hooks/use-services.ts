import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/lib/api/services';
import type {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceFilterDto,
} from '@/lib/types/services';
import { toast } from 'sonner';

export const useServices = (filter?: ServiceFilterDto) => {
  return useQuery({
    queryKey: ['services', filter],
    queryFn: () => servicesApi.getServices(filter),
    staleTime: 3 * 60 * 1000, // 3 минуты
  });
};

export const useActiveServices = (filter?: ServiceFilterDto) => {
  return useQuery({
    queryKey: ['services', 'active', filter],
    queryFn: () => servicesApi.getActiveServices(filter),
    staleTime: 3 * 60 * 1000,
  });
};

export const useService = (id: string) => {
  return useQuery({
    queryKey: ['services', id],
    queryFn: () => servicesApi.getService(id),
    enabled: !!id,
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceDto) => servicesApi.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Услуга создана');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания услуги');
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceDto }) =>
      servicesApi.updateService(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['services', variables.id] });
      toast.success('Услуга обновлена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления услуги');
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => servicesApi.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Услуга удалена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления услуги');
    },
  });
};
