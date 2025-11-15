import { apiClient } from './client';
import { CalendarEventStatus } from './calendar-event-status';

export interface Schedule {
  id: string;
  groupId?: string;
  teacherId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'GROUP_CLASS' | 'INDIVIDUAL_CLASS' | 'OPEN_CLASS' | 'EVENT';
  isRecurring: boolean;
  recurrenceRule?: string;
  status: CalendarEventStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  group?: {
    id: string;
    name: string;
    studio: {
      id: string;
      name: string;
    };
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
  };
  room: {
    id: string;
    name: string;
    number?: string;
  };
  _count?: {
    attendances: number;
  };
}

export interface CreateScheduleDto {
  groupId?: string;
  teacherId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'GROUP_CLASS' | 'INDIVIDUAL_CLASS' | 'OPEN_CLASS' | 'EVENT';
  isRecurring?: boolean;
  recurrenceRule?: string;
  status?: CalendarEventStatus;
  notes?: string;
}

export interface UpdateScheduleDto extends Partial<CreateScheduleDto> {}

export interface ScheduleFilters {
  date?: string;
  roomId?: string | string[];
  teacherId?: string | string[];
  groupId?: string | string[];
  eventTypeId?: string | string[];
}

export const schedulesApi = {
  getSchedules: async (filters?: ScheduleFilters): Promise<Schedule[]> => {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);

    // Handle array or single value for filters
    if (filters?.roomId) {
      if (Array.isArray(filters.roomId)) {
        filters.roomId.forEach(id => params.append('roomId', id));
      } else {
        params.append('roomId', filters.roomId);
      }
    }

    if (filters?.teacherId) {
      if (Array.isArray(filters.teacherId)) {
        filters.teacherId.forEach(id => params.append('teacherId', id));
      } else {
        params.append('teacherId', filters.teacherId);
      }
    }

    if (filters?.groupId) {
      if (Array.isArray(filters.groupId)) {
        filters.groupId.forEach(id => params.append('groupId', id));
      } else {
        params.append('groupId', filters.groupId);
      }
    }

    if (filters?.eventTypeId) {
      if (Array.isArray(filters.eventTypeId)) {
        filters.eventTypeId.forEach(id => params.append('eventTypeId', id));
      } else {
        params.append('eventTypeId', filters.eventTypeId);
      }
    }

    const { data } = await apiClient.get(`/schedules?${params.toString()}`);
    return data;
  },

  getSchedule: async (id: string): Promise<Schedule> => {
    const { data } = await apiClient.get(`/schedules/${id}`);
    return data;
  },

  createSchedule: async (scheduleData: CreateScheduleDto): Promise<Schedule> => {
    const { data } = await apiClient.post('/schedules', scheduleData);
    return data;
  },

  updateSchedule: async (id: string, scheduleData: UpdateScheduleDto): Promise<Schedule> => {
    const { data } = await apiClient.patch(`/schedules/${id}`, scheduleData);
    return data;
  },

  deleteSchedule: async (id: string): Promise<void> => {
    await apiClient.delete(`/schedules/${id}`);
  },
};
