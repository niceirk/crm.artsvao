import { apiClient } from './client';
import type {
  NomenclatureItem,
  NomenclatureStats,
  ServiceCategory,
  NomenclatureFilterDto,
  CreateSubscriptionTypeNomenclatureDto,
  UpdateSubscriptionTypeNomenclatureDto,
  UpdateSingleSessionDto,
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
  IndependentService,
  CreateIndependentServiceDto,
  UpdateIndependentServiceDto,
} from '../types/nomenclature';

export const nomenclatureApi = {
  // =============================================
  // Получение номенклатуры (READ)
  // =============================================

  getAll: async (filter?: NomenclatureFilterDto): Promise<NomenclatureItem[]> => {
    const params = new URLSearchParams();
    if (filter?.type) params.append('type', filter.type);
    if (filter?.categoryId) params.append('categoryId', filter.categoryId);
    if (filter?.groupId) params.append('groupId', filter.groupId);
    if (filter?.search) params.append('search', filter.search);
    if (filter?.isActive !== undefined) params.append('isActive', String(filter.isActive));

    const query = params.toString();
    const url = query ? `/nomenclature?${query}` : '/nomenclature';

    const response = await apiClient.get<NomenclatureItem[]>(url);
    return response.data;
  },

  getStats: async (): Promise<NomenclatureStats> => {
    const response = await apiClient.get<NomenclatureStats>('/nomenclature/stats');
    return response.data;
  },

  getCategories: async (): Promise<ServiceCategory[]> => {
    const response = await apiClient.get<ServiceCategory[]>('/nomenclature/categories');
    return response.data;
  },

  // =============================================
  // CRUD для типов абонементов (SubscriptionType)
  // =============================================

  createSubscriptionType: async (data: CreateSubscriptionTypeNomenclatureDto): Promise<any> => {
    const response = await apiClient.post('/nomenclature/subscription-types', data);
    return response.data;
  },

  updateSubscriptionType: async (id: string, data: UpdateSubscriptionTypeNomenclatureDto): Promise<any> => {
    const response = await apiClient.patch(`/nomenclature/subscription-types/${id}`, data);
    return response.data;
  },

  deactivateSubscriptionType: async (id: string): Promise<void> => {
    await apiClient.delete(`/nomenclature/subscription-types/${id}`);
  },

  // =============================================
  // CRUD для разовых посещений (через Group)
  // =============================================

  updateSingleSession: async (data: UpdateSingleSessionDto): Promise<any> => {
    const response = await apiClient.patch('/nomenclature/single-sessions', data);
    return response.data;
  },

  // =============================================
  // CRUD для категорий услуг (ServiceCategory)
  // =============================================

  createCategory: async (data: CreateServiceCategoryDto): Promise<ServiceCategory> => {
    const response = await apiClient.post<ServiceCategory>('/nomenclature/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: UpdateServiceCategoryDto): Promise<ServiceCategory> => {
    const response = await apiClient.patch<ServiceCategory>(`/nomenclature/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/nomenclature/categories/${id}`);
  },

  // =============================================
  // CRUD для независимых услуг (IndependentService)
  // =============================================

  getIndependentServices: async (): Promise<IndependentService[]> => {
    const response = await apiClient.get<IndependentService[]>('/nomenclature/independent-services');
    return response.data;
  },

  createIndependentService: async (data: CreateIndependentServiceDto): Promise<IndependentService> => {
    const response = await apiClient.post<IndependentService>('/nomenclature/independent-services', data);
    return response.data;
  },

  updateIndependentService: async (id: string, data: UpdateIndependentServiceDto): Promise<IndependentService> => {
    const response = await apiClient.patch<IndependentService>(`/nomenclature/independent-services/${id}`, data);
    return response.data;
  },

  deactivateIndependentService: async (id: string): Promise<void> => {
    await apiClient.delete(`/nomenclature/independent-services/${id}`);
  },
};
