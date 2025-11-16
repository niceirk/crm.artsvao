import { apiClient } from './client';
import { WeeklyScheduleItem } from '../types/weekly-schedule';

export interface Group {
  id: string;
  name: string;
  maxParticipants: number;
  singleSessionPrice: number;
  ageMin?: number;
  ageMax?: number;
  duration?: number; // Длительность занятия в минутах
  weeklySchedule?: WeeklyScheduleItem[]; // Паттерн расписания
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
  duration?: number;
  weeklySchedule?: WeeklyScheduleItem[];
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  studioId: string;
  teacherId: string;
  roomId?: string;
}

export interface UpdateGroupDto extends Partial<CreateGroupDto> {}

export interface GroupMember {
  id: string; // subscription id
  clientId: string;
  validMonth: string;
  startDate: string;
  endDate: string;
  remainingVisits?: number;
  status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED';
  client: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    phone: string;
    email?: string;
    photoUrl?: string;
  };
  subscriptionType: {
    id: string;
    name: string;
    type: 'UNLIMITED' | 'SINGLE_VISIT';
  };
}

export interface AddMemberDto {
  clientId: string;
  subscriptionTypeId: string;
  purchaseDate: string;
  startDate: string;
  endDate: string;
  validMonth: string;
  originalPrice: number;
  paidPrice: number;
  remainingVisits?: number;
  purchasedMonths?: number;
}

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

  // Новые методы для детальной страницы группы
  getGroupMembers: async (groupId: string): Promise<GroupMember[]> => {
    const { data } = await apiClient.get(`/groups/${groupId}/members`);
    return data;
  },

  addGroupMember: async (groupId: string, memberData: AddMemberDto): Promise<GroupMember> => {
    const { data } = await apiClient.post(`/groups/${groupId}/members`, memberData);
    return data;
  },

  removeGroupMember: async (groupId: string, clientId: string): Promise<void> => {
    await apiClient.delete(`/groups/${groupId}/members/${clientId}`);
  },

  getGroupMonthlySchedule: async (groupId: string, year: number, month: number): Promise<any[]> => {
    const { data } = await apiClient.get(`/groups/${groupId}/schedule/monthly`, {
      params: { year, month },
    });
    return data;
  },

  updateWeeklySchedule: async (groupId: string, weeklySchedule: WeeklyScheduleItem[]): Promise<Group> => {
    const { data } = await apiClient.patch(`/groups/${groupId}/weekly-schedule`, {
      weeklySchedule,
    });
    return data;
  },

  getGroupSubscriptionTypes: async (groupId: string): Promise<any[]> => {
    const { data } = await apiClient.get(`/groups/${groupId}/subscription-types`);
    return data;
  },
};
