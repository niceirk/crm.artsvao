import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { benefitCategoriesApi } from '@/lib/api/benefit-categories';
import type {
  CreateBenefitCategoryDto,
  UpdateBenefitCategoryDto,
} from '@/lib/types/benefit-categories';
import { toast } from 'sonner';

export const useBenefitCategories = () => {
  return useQuery({
    queryKey: ['benefit-categories'],
    queryFn: () => benefitCategoriesApi.getBenefitCategories(),
    staleTime: 5 * 60 * 1000, // 5 минут для справочников
  });
};

export const useActiveBenefitCategories = () => {
  return useQuery({
    queryKey: ['benefit-categories', 'active'],
    queryFn: () => benefitCategoriesApi.getActiveBenefitCategories(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useBenefitCategory = (id: string) => {
  return useQuery({
    queryKey: ['benefit-categories', id],
    queryFn: () => benefitCategoriesApi.getBenefitCategory(id),
    enabled: !!id,
  });
};

export const useCreateBenefitCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBenefitCategoryDto) =>
      benefitCategoriesApi.createBenefitCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefit-categories'] });
      toast.success('Льготная категория создана');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания льготной категории');
    },
  });
};

export const useUpdateBenefitCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBenefitCategoryDto }) =>
      benefitCategoriesApi.updateBenefitCategory(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['benefit-categories'] });
      queryClient.invalidateQueries({ queryKey: ['benefit-categories', variables.id] });
      toast.success('Льготная категория обновлена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления льготной категории');
    },
  });
};

export const useDeleteBenefitCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => benefitCategoriesApi.deleteBenefitCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefit-categories'] });
      toast.success('Льготная категория удалена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления льготной категории');
    },
  });
};
