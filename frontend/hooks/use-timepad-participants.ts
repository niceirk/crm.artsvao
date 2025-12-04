'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getTimepadParticipants,
  extractTimepadEventId,
  TimepadParticipantsResponse,
  GetParticipantsParams,
} from '@/lib/api/timepad';

/**
 * Hook для получения участников мероприятия из Timepad
 * @param timepadLink - ссылка на мероприятие в Timepad
 * @param params - параметры запроса (limit, skip, email)
 */
export function useTimepadParticipants(
  timepadLink: string | null | undefined,
  params: GetParticipantsParams = {}
) {
  const eventId = timepadLink ? extractTimepadEventId(timepadLink) : null;

  return useQuery<TimepadParticipantsResponse>({
    queryKey: ['timepad-participants', eventId, params],
    queryFn: () => {
      if (!eventId) {
        throw new Error('Не удалось извлечь ID мероприятия из ссылки');
      }
      return getTimepadParticipants(eventId, params);
    },
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 секунд - данные могут часто меняться
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
