import { apiClient } from './client';

export type EventParticipantStatus = 'REGISTERED' | 'CONFIRMED' | 'NO_SHOW' | 'CANCELLED';
export type EventRegistrationSource = 'CRM' | 'TIMEPAD' | 'TELEGRAM';

export interface EventParticipant {
  id: string;
  eventId: string;
  clientId: string;
  status: EventParticipantStatus;
  source: EventRegistrationSource;
  registeredAt: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  telegramChatId?: number | null;
  reminderSentAt?: string | null;
  notes?: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    phone: string;
    email?: string | null;
    birthDate?: string | null;
  };
}

export interface EventParticipantsResponse {
  data: EventParticipant[];
  total: number;
  page: number;
  limit: number;
}

export interface EventAvailability {
  maxCapacity: number | null;
  timepadRegistrations: number;
  crmRegistrations: number;
  totalRegistrations: number;
  available: number | null;
  hasLimit: boolean;
}

export interface RegisterParticipantDto {
  clientId: string;
  source?: EventRegistrationSource;
  telegramChatId?: number;
  notes?: string;
}

export interface EventParticipantsQueryParams {
  status?: EventParticipantStatus;
  page?: number;
  limit?: number;
}

export const eventParticipantsApi = {
  /**
   * Получить список участников мероприятия
   */
  getParticipants: async (
    eventId: string,
    params?: EventParticipantsQueryParams
  ): Promise<EventParticipantsResponse> => {
    const response = await apiClient.get(`/events/${eventId}/participants`, { params });
    return response.data;
  },

  /**
   * Зарегистрировать участника на мероприятие
   */
  register: async (
    eventId: string,
    data: RegisterParticipantDto
  ): Promise<EventParticipant> => {
    const response = await apiClient.post(`/events/${eventId}/participants`, data);
    return response.data;
  },

  /**
   * Подтвердить присутствие участника
   */
  confirm: async (eventId: string, clientId: string): Promise<EventParticipant> => {
    const response = await apiClient.patch(
      `/events/${eventId}/participants/${clientId}/confirm`
    );
    return response.data;
  },

  /**
   * Отметить неявку участника
   */
  markNoShow: async (eventId: string, clientId: string): Promise<EventParticipant> => {
    const response = await apiClient.patch(
      `/events/${eventId}/participants/${clientId}/no-show`
    );
    return response.data;
  },

  /**
   * Отменить регистрацию участника
   */
  cancel: async (eventId: string, clientId: string): Promise<void> => {
    await apiClient.delete(`/events/${eventId}/participants/${clientId}`);
  },

  /**
   * Проверить доступность мест на мероприятие
   */
  checkAvailability: async (eventId: string): Promise<EventAvailability> => {
    const response = await apiClient.get(`/events/${eventId}/participants/availability`);
    return response.data;
  },
};
