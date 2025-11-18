import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { benefitCategoriesApi } from '@/lib/api/benefit-categories';
import type { CreateBenefitCategoryDto, UpdateBenefitCategoryDto } from '@/lib/types/benefit-categories';
import { toast } from '@/lib/utils/toast';

/**
 * Hook для получения всех льготных категорий
 */
export const useBenefitCategories = () => {
  return useQuery({
    queryKey: ['benefit-categories'],
    queryFn: benefitCategoriesApi.getBenefitCategories,
  });
};

/**
 * Hook для получения активных льготных категорий
 */
export const useActiveBenefitCategories = () => {
  return useQuery({
    queryKey: ['benefit-categories', 'active'],
    queryFn: benefitCategoriesApi.getActiveBenefitCategories,
  });
};

/**
 * Hook для получения одной льготной категории
 */
export const useBenefitCategory = (id: string) => {
  return useQuery({
    queryKey: ['benefit-categories', id],
    queryFn: () => benefitCategoriesApi.getBenefitCategory(id),
    enabled: !!id,
  });
};

/**
 * Hook для создания льготной категории
 */
export const useCreateBenefitCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBenefitCategoryDto) => benefitCategoriesApi.createBenefitCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefit-categories'] });
      toast.success('Категория создана', {
        description: 'Новая льготная категория успешно добавлена',
      });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
        description: error.response?.data?.message || 'Не удалось создать категорию',
      });
    },
  });
};

/**
 * Hook для обновления льготной категории
 */
export const useUpdateBenefitCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBenefitCategoryDto }) =>
      benefitCategoriesApi.updateBenefitCategory(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['benefit-categories'] });
      queryClient.invalidateQueries({ queryKey: ['benefit-categories', variables.id] });
      toast.success('Категория обновлена', {
        description: 'Данные категории успешно обновлены',
      });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
        description: error.response?.data?.message || 'Не удалось обновить категорию',
      });
    },
  });
};

/**
 * Hook для удаления льготной категории
 */
export const useDeleteBenefitCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => benefitCategoriesApi.deleteBenefitCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefit-categories'] });
      toast.success('Категория удалена', {
        description: 'Льготная категория успешно удалена',
      });
    },
    onError: (error: any) => {
      toast.error('Ошибка', {
        description: error.response?.data?.message || 'Не удалось удалить категорию',
      });
    },
  });
};
