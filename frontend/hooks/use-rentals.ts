import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rentalsApi, type RentalFilters, type CreateRentalDto, type UpdateRentalDto, type Rental } from '@/lib/api/rentals';
import { toast } from '@/lib/utils/toast';

export const useRentals = (filters?: RentalFilters) => {
  return useQuery({
    queryKey: ['rentals', filters],
    queryFn: () => rentalsApi.getRentals(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useRental = (id: string) => {
  return useQuery({
    queryKey: ['rentals', id],
    queryFn: () => rentalsApi.getRental(id),
    enabled: !!id,
  });
};

export const useCreateRental = () => {
  const queryClient = useQueryClient();return useMutation({
    mutationFn: (data: CreateRentalDto) => rentalsApi.createRental(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Аренда создана');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка создания аренды');
    },
  });
};

export const useUpdateRental = () => {
  const queryClient = useQueryClient();return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRentalDto }) =>
      rentalsApi.updateRental(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['rentals'] });

      // Snapshot the previous value
      const previousRentals = queryClient.getQueriesData({ queryKey: ['rentals'] });

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ['rentals'] }, (old: any) => {
        if (!old) return old;
        return old.map((rental: Rental) =>
          rental.id === id ? { ...rental, ...data } : rental
        );
      });

      // Return a context object with the snapshotted value
      return { previousRentals };
    },
    onError: (error: any, _, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousRentals) {
        context.previousRentals.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.response?.data?.message || 'Ошибка обновления аренды');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
};

export const useDeleteRental = () => {
  const queryClient = useQueryClient();return useMutation({
    mutationFn: (id: string) => rentalsApi.deleteRental(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Аренда удалена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка удаления аренды');
    },
  });
};
