import { apiClient } from './client';
import type {
  Attendance,
  AttendanceStats,
  CreateAttendanceDto,
  UpdateAttendanceDto,
  AttendanceFilterDto,
  PaginatedAttendanceResponse,
  AttendanceBasesResponse,
} from '../types/attendance';

export const attendanceApi = {
  /**
   * Отметить посещение
   */
  mark: async (data: CreateAttendanceDto): Promise<Attendance> => {
    const response = await apiClient.post<Attendance>('/attendance', data);
    return response.data;
  },

  /**
   * Получить список всех посещений с фильтрацией
   */
  getAll: async (
    filter?: AttendanceFilterDto,
  ): Promise<PaginatedAttendanceResponse> => {
    const params = new URLSearchParams();
    if (filter?.scheduleId) params.append('scheduleId', filter.scheduleId);
    if (filter?.groupId) params.append('groupId', filter.groupId);
    if (filter?.clientId) params.append('clientId', filter.clientId);
    if (filter?.status) params.append('status', filter.status);
    if (filter?.dateFrom) params.append('dateFrom', filter.dateFrom);
    if (filter?.dateTo) params.append('dateTo', filter.dateTo);
    if (filter?.page) params.append('page', String(filter.page));
    if (filter?.limit) params.append('limit', String(filter.limit));

    const query = params.toString();
    const url = query ? `/attendance?${query}` : '/attendance';

    const response =
      await apiClient.get<PaginatedAttendanceResponse>(url);
    return response.data;
  },

  /**
   * Получить журнал посещаемости по конкретному занятию
   */
  getBySchedule: async (scheduleId: string): Promise<Attendance[]> => {
    const response = await apiClient.get<Attendance[]>(
      `/attendance/by-schedule/${scheduleId}`,
    );
    return response.data;
  },

  /**
   * Получить статистику посещаемости клиента
   */
  getClientStats: async (
    clientId: string,
    from?: string,
    to?: string,
  ): Promise<AttendanceStats> => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const query = params.toString();
    const url = query
      ? `/attendance/stats/${clientId}?${query}`
      : `/attendance/stats/${clientId}`;

    const response = await apiClient.get<AttendanceStats>(url);
    return response.data;
  },

  /**
   * Получить одну запись посещения
   */
  getById: async (id: string): Promise<Attendance> => {
    const response = await apiClient.get<Attendance>(`/attendance/${id}`);
    return response.data;
  },

  /**
   * Получить возможные основания для занятия
   */
  getBasesBySchedule: async (
    scheduleId: string,
  ): Promise<AttendanceBasesResponse> => {
    const response = await apiClient.get<AttendanceBasesResponse>(
      `/attendance/bases/${scheduleId}`,
    );
    return response.data;
  },

  /**
   * Обновить статус посещения
   */
  update: async (id: string, data: UpdateAttendanceDto): Promise<Attendance> => {
    const response = await apiClient.patch<Attendance>(
      `/attendance/${id}`,
      data,
    );
    return response.data;
  },

  /**
   * Удалить запись посещения (только ADMIN)
   */
  delete: async (
    id: string,
  ): Promise<{ message: string; scheduleId: string }> => {
    const response = await apiClient.delete<{
      message: string;
      scheduleId: string;
    }>(`/attendance/${id}`);
    return response.data;
  },
};
