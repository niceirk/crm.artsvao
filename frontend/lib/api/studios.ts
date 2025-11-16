import { apiClient } from './client';

export interface Studio {
  id: string;
  name: string;
  description?: string;
  type: 'GROUP' | 'INDIVIDUAL' | 'BOTH';
  category?: string;
  photoUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  _count?: {
    groups: number;
  };
}

export interface CreateStudioDto {
  name: string;
  description?: string;
  type: 'GROUP' | 'INDIVIDUAL' | 'BOTH';
  category?: string;
  photoUrl?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateStudioDto extends Partial<CreateStudioDto> {}

export interface StudioStats {
  groupsCount: number;
  activeSubscriptionsCount: number;
  participantsCount: number;
}

export const studiosApi = {
  getStudios: async (): Promise<Studio[]> => {
    const { data } = await apiClient.get('/studios');
    return data;
  },

  getStudio: async (id: string): Promise<Studio> => {
    const { data } = await apiClient.get(`/studios/${id}`);
    return data;
  },

  createStudio: async (studioData: CreateStudioDto): Promise<Studio> => {
    const { data } = await apiClient.post('/studios', studioData);
    return data;
  },

  updateStudio: async (id: string, studioData: UpdateStudioDto): Promise<Studio> => {
    const { data } = await apiClient.patch(`/studios/${id}`, studioData);
    return data;
  },

  deleteStudio: async (id: string): Promise<void> => {
    await apiClient.delete(`/studios/${id}`);
  },

  // Новые методы для детальной страницы студии
  getStudioGroups: async (studioId: string): Promise<any[]> => {
    const { data } = await apiClient.get(`/studios/${studioId}/groups`);
    return data;
  },

  getStudioSubscriptionTypes: async (studioId: string): Promise<any[]> => {
    const { data } = await apiClient.get(`/studios/${studioId}/subscription-types`);
    return data;
  },

  getStudioStats: async (studioId: string): Promise<StudioStats> => {
    const { data } = await apiClient.get(`/studios/${studioId}/stats`);
    return data;
  },
};
