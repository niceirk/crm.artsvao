import { apiClient } from './client';
import { CalendarEventStatus } from './calendar-event-status';

export interface Schedule {
  id: string;
  version: number; // Версия для оптимистичной блокировки
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

export interface UpdateScheduleDto extends Partial<CreateScheduleDto> {
  version?: number; // Для защиты от перезатирания
}

export interface RecurrenceRuleDto {
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startDate: string; // ISO date
  endDate: string; // ISO date
  time: {
    start: string; // HH:mm
    end: string; // HH:mm
  };
}

export interface CreateRecurringScheduleDto {
  groupId: string;
  teacherId: string;
  roomId: string;
  type?: 'GROUP_CLASS' | 'INDIVIDUAL_CLASS' | 'OPEN_CLASS' | 'EVENT';
  recurrenceRule: RecurrenceRuleDto;
  autoEnrollClients?: boolean;
}

export interface BulkUpdateScheduleDto {
  scheduleIds: string[];
  groupId?: string;
  teacherId?: string;
  roomId?: string;
  startTime?: string;
  endTime?: string;
  type?: 'GROUP_CLASS' | 'INDIVIDUAL_CLASS' | 'OPEN_CLASS' | 'EVENT';
  status?: CalendarEventStatus;
}

export interface CopyScheduleDto {
  scheduleIds: string[];
  targetDate: string;
  preserveTime?: boolean;
  autoEnrollClients?: boolean;
}

export interface BulkCancelScheduleDto {
  scheduleIds: string[];
  reason: string;
  action: 'CANCEL' | 'TRANSFER';
  transferDate?: string;
  transferStartTime?: string;
  transferEndTime?: string;
  notifyClients?: boolean;
}

export interface BulkDeleteScheduleDto {
  scheduleIds: string[];
  reason?: string;
}

export interface ScheduleFilters {
  date?: string;
  roomId?: string | string[];
  teacherId?: string | string[];
  groupId?: string | string[];
  eventTypeId?: string | string[];
}

// ===== Schedule Planner Types =====

export interface WeeklyScheduleItem {
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  startTime: string;
  roomId?: string;
}

export interface PreviewGroupDto {
  groupId: string;
  teacherId: string;
  roomId: string;
  weeklySchedule: WeeklyScheduleItem[];
  duration: number;
}

export interface PreviewRecurringScheduleDto {
  groups: PreviewGroupDto[];
  month: string; // "2025-01" format
}

export interface ConflictInfo {
  type: 'room' | 'teacher' | 'rental' | 'event';
  reason: string;
}

export interface PreviewScheduleItem {
  tempId: string;
  groupId: string;
  groupName: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId: string;
  roomName: string;
  teacherId: string;
  teacherName: string;
  hasConflict: boolean;
  conflicts: ConflictInfo[];
}

export interface PreviewResult {
  schedules: PreviewScheduleItem[];
  summary: {
    total: number;
    withConflicts: number;
    byGroup: Record<string, { total: number; conflicts: number; groupName: string }>;
  };
}

export interface BulkScheduleItem {
  groupId: string;
  teacherId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface BulkCreateRecurringDto {
  schedules: BulkScheduleItem[];
  autoEnrollClients?: boolean;
}

export interface BulkCreateResult {
  created: {
    count: number;
    schedules: Schedule[];
  };
  failed: {
    count: number;
    errors: Array<{
      schedule: BulkScheduleItem;
      reason: string;
    }>;
  };
}

export interface PlannedSchedulesQuery {
  status?: string;
  year?: number;
  month?: number;
  groupIds?: string[];
}

export interface MonthStats {
  yearMonth: string;
  count: number;
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

  createRecurring: async (data: CreateRecurringScheduleDto): Promise<any> => {
    const { data: response } = await apiClient.post('/schedules/recurring', data);
    return response;
  },

  bulkUpdate: async (data: BulkUpdateScheduleDto): Promise<any> => {
    const { data: response } = await apiClient.patch('/schedules/bulk', data);
    return response;
  },

  copySchedules: async (data: CopyScheduleDto): Promise<any> => {
    const { data: response } = await apiClient.post('/schedules/copy', data);
    return response;
  },

  bulkCancel: async (data: BulkCancelScheduleDto): Promise<any> => {
    const { data: response } = await apiClient.post('/schedules/bulk-cancel', data);
    return response;
  },

  bulkDelete: async (data: BulkDeleteScheduleDto): Promise<any> => {
    const { data: response } = await apiClient.post('/schedules/bulk-delete', data);
    return response;
  },

  // ===== Schedule Planner Methods =====

  previewRecurring: async (data: PreviewRecurringScheduleDto): Promise<PreviewResult> => {
    const { data: response } = await apiClient.post('/schedules/recurring/preview', data);
    return response;
  },

  bulkCreateRecurring: async (data: BulkCreateRecurringDto): Promise<BulkCreateResult> => {
    const { data: response } = await apiClient.post('/schedules/recurring/bulk', data);
    return response;
  },

  getPlannedSchedules: async (params: PlannedSchedulesQuery): Promise<Schedule[]> => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    if (params.year) searchParams.append('year', params.year.toString());
    if (params.month) searchParams.append('month', params.month.toString());
    if (params.groupIds && params.groupIds.length > 0) {
      searchParams.append('groupIds', params.groupIds.join(','));
    }
    const { data } = await apiClient.get(`/schedules/planned?${searchParams.toString()}`);
    return data;
  },

  getPlannedMonthsStats: async (groupIds?: string[]): Promise<MonthStats[]> => {
    const params = groupIds && groupIds.length > 0 ? `?groupIds=${groupIds.join(',')}` : '';
    const { data } = await apiClient.get(`/schedules/planned/months-stats${params}`);
    return data;
  },
};
