import { apiClient } from './client';
import type {
  Service,
  CreateServiceDto,
  UpdateServiceDto,
  ServiceFilterDto,
} from '../types/services';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const servicesApi = {
  getServices: async (filter?: ServiceFilterDto): Promise<PaginatedResponse<Service>> => {
    const response = await apiClient.get('/services', { params: filter });
    return response.data;
  },

  getActiveServices: async (filter?: ServiceFilterDto): Promise<Service[]> => {
    const response = await apiClient.get('/services/active', { params: filter });
    return response.data;
  },

  getService: async (id: string): Promise<Service> => {
    const response = await apiClient.get(`/services/${id}`);
    return response.data;
  },

  createService: async (data: CreateServiceDto): Promise<Service> => {
    const response = await apiClient.post('/services', data);
    return response.data;
  },

  updateService: async (id: string, data: UpdateServiceDto): Promise<Service> => {
    const response = await apiClient.patch(`/services/${id}`, data);
    return response.data;
  },

  deleteService: async (id: string): Promise<void> => {
    await apiClient.delete(`/services/${id}`);
  },
};
