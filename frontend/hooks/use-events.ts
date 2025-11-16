import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi, type Event, type CreateEventDto, type UpdateEventDto, type EventFilters } from '@/lib/api/events';
import { toast } from '@/lib/utils/toast';

export const useEvents = (filters?: EventFilters) => {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventsApi.getEvents(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useEvent = (id: string) => {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.getEvent(id),
    enabled: !!id,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventDto) => eventsApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Мероприятие создано');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания мероприятия');
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventDto }) =>
      eventsApi.updateEvent(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['events'] });

      // Snapshot the previous value
      const previousEvents = queryClient.getQueriesData({ queryKey: ['events'] });

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ['events'] }, (old: any) => {
        if (!old) return old;
        return old.map((event: Event) =>
          event.id === id ? { ...event, ...data } : event
        );
      });

      // Return a context object with the snapshotted value
      return { previousEvents };
    },
    onError: (error: any, _, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousEvents) {
        context.previousEvents.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.response?.data?.message || 'Ошибка обновления мероприятия');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => eventsApi.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Мероприятие удалено');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления мероприятия');
    },
  });
};
