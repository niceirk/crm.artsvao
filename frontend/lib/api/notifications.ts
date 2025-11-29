import { apiClient } from './client';
import type {
  NotificationTemplate,
  CreateTemplateDto,
  UpdateTemplateDto,
  Notification,
  CreateNotificationDto,
  MassSendDto,
  MassSendResult,
  NotificationQuery,
  TemplateQuery,
  NotificationStats,
  QueueStats,
  PaginatedNotifications,
  TemplatePreview,
} from '../types/notifications';

const BASE_URL = '/unified-notifications';

// ============================
// УВЕДОМЛЕНИЯ
// ============================

/**
 * Получить список уведомлений с фильтрацией
 */
export const getNotifications = async (
  params?: NotificationQuery
): Promise<PaginatedNotifications> => {
  const response = await apiClient.get<PaginatedNotifications>(BASE_URL, {
    params,
  });
  return response.data;
};

/**
 * Получить уведомление по ID
 */
export const getNotification = async (id: string): Promise<Notification> => {
  const response = await apiClient.get<Notification>(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Создать уведомление в очередь
 */
export const createNotification = async (
  data: CreateNotificationDto
): Promise<Notification> => {
  const response = await apiClient.post<Notification>(BASE_URL, data);
  return response.data;
};

/**
 * Отменить уведомление
 */
export const cancelNotification = async (id: string): Promise<Notification> => {
  const response = await apiClient.post<Notification>(`${BASE_URL}/${id}/cancel`);
  return response.data;
};

/**
 * Повторить отправку уведомления
 */
export const retryNotification = async (id: string): Promise<Notification> => {
  const response = await apiClient.post<Notification>(`${BASE_URL}/${id}/retry`);
  return response.data;
};

/**
 * Получить статистику уведомлений
 */
export const getNotificationStats = async (
  dateFrom?: string,
  dateTo?: string
): Promise<NotificationStats> => {
  const response = await apiClient.get<NotificationStats>(`${BASE_URL}/stats`, {
    params: { dateFrom, dateTo },
  });
  return response.data;
};

/**
 * Получить статистику очереди
 */
export const getQueueStats = async (): Promise<QueueStats> => {
  const response = await apiClient.get<QueueStats>(`${BASE_URL}/queue-stats`);
  return response.data;
};

// ============================
// МАССОВЫЕ РАССЫЛКИ
// ============================

/**
 * Создать массовую рассылку
 */
export const createMassSend = async (
  data: MassSendDto
): Promise<MassSendResult> => {
  const response = await apiClient.post<MassSendResult>(
    `${BASE_URL}/mass-send`,
    data
  );
  return response.data;
};

// ============================
// ШАБЛОНЫ
// ============================

/**
 * Получить список шаблонов
 */
export const getTemplates = async (
  params?: TemplateQuery
): Promise<NotificationTemplate[]> => {
  const response = await apiClient.get<NotificationTemplate[]>(
    `${BASE_URL}/templates`,
    { params }
  );
  return response.data;
};

/**
 * Получить шаблон по ID
 */
export const getTemplate = async (id: string): Promise<NotificationTemplate> => {
  const response = await apiClient.get<NotificationTemplate>(
    `${BASE_URL}/templates/${id}`
  );
  return response.data;
};

/**
 * Создать шаблон
 */
export const createTemplate = async (
  data: CreateTemplateDto
): Promise<NotificationTemplate> => {
  const response = await apiClient.post<NotificationTemplate>(
    `${BASE_URL}/templates`,
    data
  );
  return response.data;
};

/**
 * Обновить шаблон
 */
export const updateTemplate = async (
  id: string,
  data: UpdateTemplateDto
): Promise<NotificationTemplate> => {
  const response = await apiClient.patch<NotificationTemplate>(
    `${BASE_URL}/templates/${id}`,
    data
  );
  return response.data;
};

/**
 * Удалить шаблон
 */
export const deleteTemplate = async (
  id: string
): Promise<NotificationTemplate> => {
  const response = await apiClient.delete<NotificationTemplate>(
    `${BASE_URL}/templates/${id}`
  );
  return response.data;
};

/**
 * Предпросмотр шаблона
 */
export const previewTemplate = async (
  id: string,
  sampleData: Record<string, any>
): Promise<TemplatePreview> => {
  const response = await apiClient.post<TemplatePreview>(
    `${BASE_URL}/templates/${id}/preview`,
    sampleData
  );
  return response.data;
};
