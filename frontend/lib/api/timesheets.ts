import { apiClient } from './client';
import { useAuthStore } from '../store/auth-store';
import type {
  TimesheetFilterDto,
  UpdateCompensationDto,
  TimesheetResponse,
  Studio,
  GroupForFilter,
  Compensation,
} from '../types/timesheets';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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

  /**
   * Экспорт табеля в Excel
   */
  exportToExcel: async (filter: TimesheetFilterDto): Promise<void> => {
    const params = new URLSearchParams();
    if (filter.groupId) params.append('groupId', filter.groupId);
    if (filter.month) params.append('month', filter.month);

    const token = useAuthStore.getState().accessToken;
    const query = params.toString();
    const url = `${API_URL}/timesheets/export${query ? `?${query}` : ''}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Ошибка при экспорте табеля');
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `Табель_${filter.month || 'export'}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  },
};

// Экспортируем функцию для использования без объекта
export const createBulkInvoices = timesheetsApi.createBulkInvoices;
