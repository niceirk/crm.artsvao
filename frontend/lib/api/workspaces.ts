import { apiClient } from './client';

export interface Workspace {
  id: string;
  roomId: string;
  room?: {
    id: string;
    name: string;
    number?: string;
    isCoworking: boolean;
  };
  name: string;
  number?: string;
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  description?: string;
  amenities?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    rentalApplications: number;
  };
}

export interface CreateWorkspaceDto {
  roomId: string;
  name: string;
  number?: string;
  dailyRate: number;
  monthlyRate: number;
  status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  description?: string;
  amenities?: string;
}

export interface UpdateWorkspaceDto extends Partial<CreateWorkspaceDto> {}

export interface WorkspaceAvailability {
  available: boolean;
  occupiedDates: string[];
}

export interface OccupancyInfo {
  applicationId: string;
  applicationNumber: string;
  clientName: string;
  status: string;
}

// Новый формат: workspaceId -> { date -> OccupancyInfo }
export type BatchAvailabilityResponse = Record<string, Record<string, OccupancyInfo>>;

export const workspacesApi = {
  getAll: async (roomId?: string): Promise<Workspace[]> => {
    const params = roomId ? `?roomId=${roomId}` : '';
    const { data } = await apiClient.get(`/workspaces${params}`);
    return data;
  },

  getByRoomIds: async (roomIds: string[]): Promise<Workspace[]> => {
    if (roomIds.length === 0) {
      return [];
    }
    const { data } = await apiClient.get('/workspaces/by-rooms', {
      params: { roomIds: roomIds.join(',') },
    });
    return data;
  },

  getOne: async (id: string): Promise<Workspace> => {
    const { data } = await apiClient.get(`/workspaces/${id}`);
    return data;
  },

  getAvailability: async (id: string, startDate: string, endDate: string): Promise<WorkspaceAvailability> => {
    const { data } = await apiClient.get(`/workspaces/${id}/availability`, {
      params: { startDate, endDate },
    });
    return data;
  },

  getBatchAvailability: async (
    workspaceIds: string[],
    startDate: string,
    endDate: string
  ): Promise<BatchAvailabilityResponse> => {
    const { data } = await apiClient.post('/workspaces/batch-availability', {
      workspaceIds,
      startDate,
      endDate,
    });
    return data;
  },

  create: async (dto: CreateWorkspaceDto): Promise<Workspace> => {
    const { data } = await apiClient.post('/workspaces', dto);
    return data;
  },

  update: async (id: string, dto: UpdateWorkspaceDto): Promise<Workspace> => {
    const { data } = await apiClient.patch(`/workspaces/${id}`, dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${id}`);
  },
};
