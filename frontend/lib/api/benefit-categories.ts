import { apiClient } from './client';
import type {
  BenefitCategory,
  CreateBenefitCategoryDto,
  UpdateBenefitCategoryDto,
} from '../types/benefit-categories';

export const benefitCategoriesApi = {
  getBenefitCategories: async (): Promise<BenefitCategory[]> => {
    const response = await apiClient.get('/benefit-categories');
    return response.data;
  },

  getActiveBenefitCategories: async (): Promise<BenefitCategory[]> => {
    const response = await apiClient.get('/benefit-categories/active');
    return response.data;
  },

  getBenefitCategory: async (id: string): Promise<BenefitCategory> => {
    const response = await apiClient.get(`/benefit-categories/${id}`);
    return response.data;
  },

  createBenefitCategory: async (data: CreateBenefitCategoryDto): Promise<BenefitCategory> => {
    const response = await apiClient.post('/benefit-categories', data);
    return response.data;
  },

  updateBenefitCategory: async (
    id: string,
    data: UpdateBenefitCategoryDto,
  ): Promise<BenefitCategory> => {
    const response = await apiClient.patch(`/benefit-categories/${id}`, data);
    return response.data;
  },

  deleteBenefitCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/benefit-categories/${id}`);
  },
};
