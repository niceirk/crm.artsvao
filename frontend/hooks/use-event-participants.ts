import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  eventParticipantsApi,
  EventParticipantsQueryParams,
  RegisterParticipantDto,
} from '@/lib/api/event-participants';
import { toast } from '@/lib/utils/toast';

const QUERY_KEY = 'event-participants';

/**
 * Хук для получения списка участников мероприятия
 */
export function useEventParticipants(
  eventId: string | undefined,
  params?: EventParticipantsQueryParams
) {
  return useQuery({
    queryKey: [QUERY_KEY, eventId, params],
    queryFn: () => eventParticipantsApi.getParticipants(eventId!, params),
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 секунд
  });
}

/**
 * Хук для проверки доступности мест
 */
export function useEventAvailability(eventId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, eventId, 'availability'],
    queryFn: () => eventParticipantsApi.checkAvailability(eventId!),
    enabled: !!eventId,
    staleTime: 30 * 1000,
  });
}

/**
 * Хук для регистрации участника на мероприятие
 */
export function useRegisterEventParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: RegisterParticipantDto;
    }) => eventParticipantsApi.register(eventId, data),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, eventId] });
      toast.success('Участник зарегистрирован');
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Не удалось зарегистрировать участника';
      toast.error(message);
    },
  });
}

/**
 * Хук для подтверждения присутствия участника
 */
export function useConfirmEventAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, clientId }: { eventId: string; clientId: string }) =>
      eventParticipantsApi.confirm(eventId, clientId),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, eventId] });
      toast.success('Присутствие подтверждено');
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Не удалось подтвердить присутствие';
      toast.error(message);
    },
  });
}

/**
 * Хук для отметки неявки участника
 */
export function useMarkEventNoShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, clientId }: { eventId: string; clientId: string }) =>
      eventParticipantsApi.markNoShow(eventId, clientId),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, eventId] });
      toast.success('Неявка отмечена');
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Не удалось отметить неявку';
      toast.error(message);
    },
  });
}

/**
 * Хук для отмены регистрации участника
 */
export function useCancelEventRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, clientId }: { eventId: string; clientId: string }) =>
      eventParticipantsApi.cancel(eventId, clientId),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, eventId] });
      toast.success('Регистрация отменена');
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Не удалось отменить регистрацию';
      toast.error(message);
    },
  });
}
