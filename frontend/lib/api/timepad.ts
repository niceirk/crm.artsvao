import { apiClient } from './client';

/** Участник мероприятия из Timepad */
export interface TimepadParticipant {
  id: number;
  email: string;
  name: string;
  status: string;
  statusTitle: string;
  createdAt: string;
  isPaid: boolean;
  paymentAmount: string | null;
  tickets: TimepadTicket[];
}

/** Билет участника */
export interface TimepadTicket {
  id: number;
  number: string;
  price: string;
  ticketType: string;
}

/** Ответ со списком участников */
export interface TimepadParticipantsResponse {
  total: number;
  participants: TimepadParticipant[];
}

/** Параметры запроса */
export interface GetParticipantsParams {
  limit?: number;
  skip?: number;
  email?: string;
}

/**
 * Извлечь event_id из ссылки Timepad
 */
export function extractTimepadEventId(link: string): string | null {
  if (!link) return null;
  const patterns = [
    /timepad\.ru\/event\/(\d+)/i,
    /\/event\/(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = link.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Получить участников мероприятия по ID события Timepad
 */
export async function getTimepadParticipants(
  eventId: string,
  params: GetParticipantsParams = {}
): Promise<TimepadParticipantsResponse> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.append('limit', String(params.limit));
  if (params.skip) searchParams.append('skip', String(params.skip));
  if (params.email) searchParams.append('email', params.email);

  const queryString = searchParams.toString();
  const url = `/timepad/events/${eventId}/orders${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<TimepadParticipantsResponse>(url);
  return response.data;
}

/**
 * Получить участников по ссылке Timepad
 */
export async function getTimepadParticipantsByLink(
  link: string,
  params: GetParticipantsParams = {}
): Promise<TimepadParticipantsResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append('link', link);
  if (params.limit) searchParams.append('limit', String(params.limit));
  if (params.skip) searchParams.append('skip', String(params.skip));
  if (params.email) searchParams.append('email', params.email);

  const response = await apiClient.get<TimepadParticipantsResponse>(`/timepad/participants?${searchParams.toString()}`);
  return response.data;
}
