import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventTypesApi, type EventType, type CreateEventTypeDto, type UpdateEventTypeDto } from '@/lib/api/event-types';
import { useToast } from '@/hooks/use-toast';

export const useEventTypes = () => {
  return useQuery({
    queryKey: ['event-types'],
    queryFn: () => eventTypesApi.getEventTypes(),
    staleTime: 5 * 60 * 1000, // 5 minutes (справочник редко меняется)
  });
};

export const useEventType = (id: string) => {
  return useQuery({
    queryKey: ['event-types', id],
    queryFn: () => eventTypesApi.getEventType(id),
    enabled: !!id,
  });
};

export const useCreateEventType = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateEventTypeDto) => eventTypesApi.createEventType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      toast({
        title: 'Успешно',
        description: 'Тип мероприятия создан',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка создания типа мероприятия',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateEventType = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventTypeDto }) =>
      eventTypesApi.updateEventType(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['event-types'] });

      // Snapshot the previous value
      const previousEventTypes = queryClient.getQueriesData({ queryKey: ['event-types'] });

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ['event-types'] }, (old: any) => {
        if (!old) return old;
        return old.map((eventType: EventType) =>
          eventType.id === id ? { ...eventType, ...data } : eventType
        );
      });

      // Return a context object with the snapshotted value
      return { previousEventTypes };
    },
    onError: (error: any, _, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousEventTypes) {
        context.previousEventTypes.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка обновления типа мероприятия',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
    },
  });
};

export const useDeleteEventType = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => eventTypesApi.deleteEventType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      toast({
        title: 'Успешно',
        description: 'Тип мероприятия удалён',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка удаления типа мероприятия',
        variant: 'destructive',
      });
    },
  });
};
