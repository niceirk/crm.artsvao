import { apiClient } from './client';
import type {
  ServiceCategory,
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
} from '../types/service-categories';

export const serviceCategoriesApi = {
  getServiceCategories: async (): Promise<ServiceCategory[]> => {
    const response = await apiClient.get('/service-categories');
    return response.data;
  },

  getServiceCategory: async (id: string): Promise<ServiceCategory> => {
    const response = await apiClient.get(`/service-categories/${id}`);
    return response.data;
  },

  createServiceCategory: async (data: CreateServiceCategoryDto): Promise<ServiceCategory> => {
    const response = await apiClient.post('/service-categories', data);
    return response.data;
  },

  updateServiceCategory: async (
    id: string,
    data: UpdateServiceCategoryDto,
  ): Promise<ServiceCategory> => {
    const response = await apiClient.patch(`/service-categories/${id}`, data);
    return response.data;
  },

  deleteServiceCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/service-categories/${id}`);
  },
};
