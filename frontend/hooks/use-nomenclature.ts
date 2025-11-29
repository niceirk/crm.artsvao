import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nomenclatureApi } from '@/lib/api/nomenclature';
import type {
  NomenclatureFilterDto,
  CreateSubscriptionTypeNomenclatureDto,
  UpdateSubscriptionTypeNomenclatureDto,
  UpdateSingleSessionDto,
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
  CreateIndependentServiceDto,
  UpdateIndependentServiceDto,
} from '@/lib/types/nomenclature';
import { toast } from 'sonner';

// =============================================
// Queries (READ)
// =============================================

export const useNomenclature = (filter?: NomenclatureFilterDto) => {
  return useQuery({
    queryKey: ['nomenclature', filter],
    queryFn: () => nomenclatureApi.getAll(filter),
  });
};

export const useNomenclatureStats = () => {
  return useQuery({
    queryKey: ['nomenclature', 'stats'],
    queryFn: () => nomenclatureApi.getStats(),
  });
};

export const useServiceCategories = () => {
  return useQuery({
    queryKey: ['nomenclature', 'categories'],
    queryFn: () => nomenclatureApi.getCategories(),
  });
};

// =============================================
// Mutations для типов абонементов (SubscriptionType)
// =============================================

export const useCreateSubscriptionTypeNomenclature = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubscriptionTypeNomenclatureDto) =>
      nomenclatureApi.createSubscriptionType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomenclature'] });
      toast.success('Тип абонемента создан');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания типа абонемента');
    },
  });
};

export const useUpdateSubscriptionTypeNomenclature = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubscriptionTypeNomenclatureDto }) =>
      nomenclatureApi.updateSubscriptionType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomenclature'] });
      toast.success('Тип абонемента обновлен');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления типа абонемента');
    },
  });
};

export const useDeactivateSubscriptionType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => nomenclatureApi.deactivateSubscriptionType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomenclature'] });
      toast.success('Тип абонемента деактивирован');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка деактивации типа абонемента');
    },
  });
};

// =============================================
// Mutations для разовых посещений (через Group)
// =============================================

export const useUpdateSingleSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSingleSessionDto) =>
      nomenclatureApi.updateSingleSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomenclature'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Разовое посещение обновлено');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления разового посещения');
    },
  });
};

// =============================================
// Mutations для категорий услуг (ServiceCategory)
// =============================================

export const useCreateServiceCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceCategoryDto) =>
      nomenclatureApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomenclature'] });
      toast.success('Категория создана');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания категории');
    },
  });
};

export const useUpdateServiceCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceCategoryDto }) =>
      nomenclatureApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomenclature'] });
      toast.success('Категория обновлена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления категории');
    },
  });
};

export const useDeleteServiceCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => nomenclatureApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomenclature'] });
      toast.success('Категория удалена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления категории');
    },
  });
};

// =============================================
// Queries/Mutations для независимых услуг (IndependentService)
// =============================================

export const useIndependentServices = () => {
  return useQuery({
    queryKey: ['nomenclature', 'independent-services'],
    queryFn: () => nomenclatureApi.getIndependentServices(),
  });
};

export const useCreateIndependentService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateIndependentServiceDto) =>
      nomenclatureApi.createIndependentService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomenclature'] });
      toast.success('Услуга создана');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания услуги');
    },
  });
};

export const useUpdateIndependentService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIndependentServiceDto }) =>
      nomenclatureApi.updateIndependentService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomenclature'] });
      toast.success('Услуга обновлена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления услуги');
    },
  });
};

export const useDeactivateIndependentService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => nomenclatureApi.deactivateIndependentService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomenclature'] });
      toast.success('Услуга деактивирована');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка деактивации услуги');
    },
  });
};
