import { apiClient } from './client';
import { WeeklyScheduleItem } from '../types/weekly-schedule';
import {
  GroupMember as NewGroupMember,
  GroupMemberStatus,
  GroupAvailability,
  AddMemberResult
} from '../types/groups';

export interface Group {
  id: string;
  name: string;
  maxParticipants: number;
  singleSessionPrice: number;
  ageMin?: number;
  ageMax?: number;
  duration?: number; // Длительность занятия в минутах
  weeklySchedule?: WeeklyScheduleItem[]; // Паттерн расписания
  isPaid?: boolean;
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
  isPaid?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  studioId: string;
  teacherId: string;
  roomId?: string;
}

export interface UpdateGroupDto extends Partial<CreateGroupDto> {}

export interface GroupFilters {
  search?: string;
  studioId?: string;
  teacherId?: string;
  roomId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  isPaid?: boolean;
  ageRange?: 'child' | 'teen' | 'adult' | 'all';
  sortBy?: 'name' | 'createdAt' | 'ageMin' | 'maxParticipants';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedGroupsResponse {
  data: Group[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

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

export interface ScheduledMonth {
  yearMonth: string; // Формат "YYYY-MM", например "2025-11"
  count: number; // Количество занятий в этом месяце
  firstDate: string; // ISO дата первого занятия
  lastDate: string; // ISO дата последнего занятия
}

export const groupsApi = {
  getGroups: async (filters?: GroupFilters): Promise<PaginatedGroupsResponse> => {
    const { data } = await apiClient.get('/groups', { params: filters });
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

  // Методы для работы с участниками группы
  getGroupMembers: async (groupId: string, status?: GroupMemberStatus): Promise<NewGroupMember[]> => {
    const { data } = await apiClient.get(`/groups/${groupId}/members`, {
      params: status ? { status } : undefined,
    });
    return data;
  },

  checkGroupAvailability: async (groupId: string): Promise<GroupAvailability> => {
    const { data } = await apiClient.get(`/groups/${groupId}/availability`);
    return data;
  },

  addGroupMember: async (groupId: string, clientId: string): Promise<AddMemberResult> => {
    const { data } = await apiClient.post(`/groups/${groupId}/members`, { clientId });
    return data;
  },

  removeGroupMember: async (memberId: string): Promise<void> => {
    await apiClient.delete(`/groups/members/${memberId}`);
  },

  getGroupWaitlist: async (groupId: string): Promise<NewGroupMember[]> => {
    const { data } = await apiClient.get(`/groups/${groupId}/waitlist`);
    return data;
  },

  updateMemberStatus: async (memberId: string, status: GroupMemberStatus): Promise<NewGroupMember> => {
    const { data } = await apiClient.patch(`/groups/members/${memberId}/status`, { status });
    return data;
  },

  getGroupMonthlySchedule: async (groupId: string, year: number, month: number): Promise<any[]> => {
    const { data } = await apiClient.get(`/groups/${groupId}/schedule/monthly`, {
      params: { year, month },
    });
    return data;
  },

  getScheduledMonths: async (groupId: string): Promise<ScheduledMonth[]> => {
    const { data } = await apiClient.get(`/groups/${groupId}/scheduled-months`);
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
