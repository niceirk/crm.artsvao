import { apiClient } from './client';

export interface Group {
  id: string;
  name: string;
  maxParticipants: number;
  singleSessionPrice: number;
  ageMin?: number;
  ageMax?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  studioId: string;
  teacherId: string;
  roomId?: string;
  createdAt: string;
  updatedAt: string;
  studio?: {
    id: string;
    name: string;
  };
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
  };
  room?: {
    id: string;
    name: string;
  };
  _count?: {
    schedules: number;
    subscriptions: number;
  };
}

export interface CreateGroupDto {
  name: string;
  maxParticipants: number;
  singleSessionPrice: number;
  ageMin?: number;
  ageMax?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  studioId: string;
  teacherId: string;
  roomId?: string;
}

export interface UpdateGroupDto extends Partial<CreateGroupDto> {}

export const groupsApi = {
  getGroups: async (): Promise<Group[]> => {
    const { data } = await apiClient.get('/groups');
    return data;
  },

  getGroup: async (id: string): Promise<Group> => {
    const { data } = await apiClient.get(`/groups/${id}`);
    return data;
  },

  createGroup: async (groupData: CreateGroupDto): Promise<Group> => {
    const { data } = await apiClient.post('/groups', groupData);
    return data;
  },

  updateGroup: async (id: string, groupData: UpdateGroupDto): Promise<Group> => {
    const { data } = await apiClient.patch(`/groups/${id}`, groupData);
    return data;
  },

  deleteGroup: async (id: string): Promise<void> => {
    await apiClient.delete(`/groups/${id}`);
  },
};
