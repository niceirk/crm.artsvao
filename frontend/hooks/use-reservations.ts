import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi, type Reservation, type CreateReservationDto, type UpdateReservationDto, type ReservationFilters } from '@/lib/api/reservations';
import { toast } from '@/lib/utils/toast';

export const useReservations = (filters?: ReservationFilters) => {
  return useQuery({
    queryKey: ['reservations', filters],
    queryFn: () => reservationsApi.getReservations(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useReservation = (id: string) => {
  return useQuery({
    queryKey: ['reservations', id],
    queryFn: () => reservationsApi.getReservation(id),
    enabled: !!id,
  });
};

export const useCreateReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReservationDto) => reservationsApi.createReservation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Резерв создан');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания резерва');
    },
  });
};

export const useUpdateReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReservationDto }) =>
      reservationsApi.updateReservation(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['reservations'] });

      // Snapshot the previous value
      const previousReservations = queryClient.getQueriesData({ queryKey: ['reservations'] });

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ['reservations'] }, (old: any) => {
        if (!old) return old;
        return old.map((reservation: Reservation) =>
          reservation.id === id ? { ...reservation, ...data } : reservation
        );
      });

      // Return a context object with the snapshotted value
      return { previousReservations };
    },
    onError: (error: any, _, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousReservations) {
        context.previousReservations.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.response?.data?.message || 'Ошибка обновления резерва');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
};

export const useDeleteReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reservationsApi.deleteReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Резерв удалён');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления резерва');
    },
  });
};
