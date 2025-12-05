'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rentalApplicationsApi } from '@/lib/api/rental-applications';
import {
  RentalApplication,
  CreateRentalApplicationDto,
  UpdateRentalApplicationDto,
  CheckAvailabilityDto,
  CalculatePriceDto,
  ExtendRentalDto,
  CancelRentalDto,
  RentalApplicationFilters,
  EditStatusResult,
} from '@/lib/types/rental-applications';
import { toast } from 'sonner';

const QUERY_KEY = 'rental-applications';

// Список заявок
export function useRentalApplications(filters?: RentalApplicationFilters) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => rentalApplicationsApi.getAll(filters),
  });
}

// Одна заявка
export function useRentalApplication(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => rentalApplicationsApi.getOne(id!),
    enabled: !!id,
  });
}

// Создание заявки
export function useCreateRentalApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRentalApplicationDto) => rentalApplicationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'batch-availability'] });
      toast.success('Заявка на аренду создана');
    },
    onError: (error: any) => {
      // Если это конфликт - не показываем ошибку (обрабатываем отдельно)
      if (error?.response?.status === 409) {
        return;
      }
      toast.error(error?.response?.data?.message || 'Ошибка при создании заявки');
    },
  });
}

// Обновление заявки
export function useUpdateRentalApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRentalApplicationDto }) =>
      rentalApplicationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Заявка обновлена');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Ошибка при обновлении заявки');
    },
  });
}

// Подтверждение заявки
export function useConfirmRentalApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => rentalApplicationsApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'batch-availability'] });
      toast.success('Заявка подтверждена. Счет создан.');
    },
    onError: (error: any) => {
      if (error?.response?.status === 409) {
        const conflicts = error?.response?.data?.conflicts;
        if (conflicts && conflicts.length > 0) {
          toast.error(`Конфликты: ${conflicts.map((c: any) => c.description).join(', ')}`);
        } else {
          toast.error(error?.response?.data?.message || 'Обнаружены конфликты при подтверждении');
        }
        return;
      }
      toast.error(error?.response?.data?.message || 'Ошибка при подтверждении заявки');
    },
  });
}

// Продление заявки
export function useExtendRentalApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExtendRentalDto }) =>
      rentalApplicationsApi.extend(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Создана заявка на продление');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Ошибка при продлении заявки');
    },
  });
}

// Отмена заявки
export function useCancelRentalApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: CancelRentalDto }) =>
      rentalApplicationsApi.cancel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'batch-availability'] });
      toast.success('Заявка отменена');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Ошибка при отмене заявки');
    },
  });
}

// Удаление заявки
export function useDeleteRentalApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => rentalApplicationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'batch-availability'] });
      toast.success('Заявка удалена');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Ошибка при удалении заявки');
    },
  });
}

// Проверка доступности
export function useCheckAvailability() {
  return useMutation({
    mutationFn: (data: CheckAvailabilityDto) => rentalApplicationsApi.checkAvailability(data),
  });
}

// Расчет цены
export function useCalculatePrice() {
  return useMutation({
    mutationFn: (data: CalculatePriceDto) => rentalApplicationsApi.calculatePrice(data),
  });
}

// Статус возможности редактирования
export function useRentalApplicationEditStatus(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id, 'edit-status'],
    queryFn: () => rentalApplicationsApi.getEditStatus(id!),
    enabled: !!id,
  });
}

// Удаление отдельного слота (Rental) из заявки
export function useRemoveRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, rentalId }: { applicationId: string; rentalId: string }) =>
      rentalApplicationsApi.removeRental(applicationId, rentalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Слот удален');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Ошибка при удалении слота');
    },
  });
}
