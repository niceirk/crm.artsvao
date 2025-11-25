import { apiClient } from './client';
import type {
  TimesheetFilterDto,
  UpdateCompensationDto,
  TimesheetResponse,
  Studio,
  GroupForFilter,
  Compensation,
} from '../types/timesheets';

export const timesheetsApi = {
  /**
   * Получить табель посещаемости для группы за месяц
   */
  getTimesheet: async (filter: TimesheetFilterDto): Promise<TimesheetResponse> => {
    const params = new URLSearchParams();
    if (filter.studioId) params.append('studioId', filter.studioId);
    if (filter.groupId) params.append('groupId', filter.groupId);
    if (filter.month) params.append('month', filter.month);

    const query = params.toString();
    const url = query ? `/timesheets?${query}` : '/timesheets';

    const response = await apiClient.get<TimesheetResponse>(url);
    return response.data;
  },

  /**
   * Получить список студий для фильтра
   */
  getStudios: async (): Promise<Studio[]> => {
    const response = await apiClient.get<Studio[]>('/timesheets/studios');
    return response.data;
  },

  /**
   * Получить список групп для фильтра
   */
  getGroups: async (studioId?: string): Promise<GroupForFilter[]> => {
    const url = studioId
      ? `/timesheets/groups?studioId=${studioId}`
      : '/timesheets/groups';
    const response = await apiClient.get<GroupForFilter[]>(url);
    return response.data;
  },

  /**
   * Обновить компенсацию (ручная корректировка)
   */
  updateCompensation: async (
    id: string,
    data: UpdateCompensationDto
  ): Promise<Compensation> => {
    const response = await apiClient.patch<Compensation>(
      `/timesheets/compensation/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Создать счета для выбранных клиентов
   */
  createBulkInvoices: async (params: {
    clientIds: string[];
    groupId: string;
    targetMonth: string;
    sendNotifications: boolean;
  }): Promise<{
    created: number;
    notificationsSent: number;
    invoiceIds: string[];
  }> => {
    const response = await apiClient.post<{
      created: number;
      notificationsSent: number;
      invoiceIds: string[];
    }>('/timesheets/create-invoices', params);
    return response.data;
  },
};

// Экспортируем функцию для использования без объекта
export const createBulkInvoices = timesheetsApi.createBulkInvoices;
