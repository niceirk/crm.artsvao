import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceCategoriesApi } from '@/lib/api/service-categories';
import type {
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
} from '@/lib/types/service-categories';
import { toast } from 'sonner';

export const useServiceCategories = () => {
  return useQuery({
    queryKey: ['service-categories'],
    queryFn: () => serviceCategoriesApi.getServiceCategories(),
    staleTime: 5 * 60 * 1000, // 5 минут для справочников
  });
};

export const useServiceCategory = (id: string) => {
  return useQuery({
    queryKey: ['service-categories', id],
    queryFn: () => serviceCategoriesApi.getServiceCategory(id),
    enabled: !!id,
  });
};

export const useCreateServiceCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceCategoryDto) =>
      serviceCategoriesApi.createServiceCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      toast.success('Категория услуг создана');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания категории услуг');
    },
  });
};

export const useUpdateServiceCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceCategoryDto }) =>
      serviceCategoriesApi.updateServiceCategory(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      queryClient.invalidateQueries({ queryKey: ['service-categories', variables.id] });
      toast.success('Категория услуг обновлена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления категории услуг');
    },
  });
};

export const useDeleteServiceCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => serviceCategoriesApi.deleteServiceCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      toast.success('Категория услуг удалена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления категории услуг');
    },
  });
};
