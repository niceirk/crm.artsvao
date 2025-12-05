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

// Создание счета для заявки
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => rentalApplicationsApi.createInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Счет сформирован');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Ошибка при создании счета');
    },
  });
}

// Массовое создание счетов
export function useCreateInvoicesBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationIds: string[]) => rentalApplicationsApi.createInvoicesBatch(applicationIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (data.errors.length > 0) {
        // Проверяем, все ли ошибки одинаковые
        const uniqueErrors = Array.from(new Set(data.errors.map(e => e.error)));
        if (data.success.length === 0 && uniqueErrors.length === 1) {
          // Все заявки с одинаковой ошибкой
          if (uniqueErrors[0].includes('уже существует')) {
            toast.info('Счета уже сформированы для всех выбранных заявок');
          } else {
            toast.warning(uniqueErrors[0]);
          }
        } else {
          toast.warning(`Создано счетов: ${data.success.length}. Пропущено: ${data.errors.length} (счета уже сформированы)`);
        }
      } else {
        toast.success(`Создано счетов: ${data.success.length}`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Ошибка при создании счетов');
    },
  });
}

// Массовая отметка оплаты
export function useMarkInvoicesPaidBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationIds: string[]) => rentalApplicationsApi.markInvoicesPaidBatch(applicationIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (data.errors.length > 0) {
        // Проверяем, все ли ошибки одинаковые
        const uniqueErrors = Array.from(new Set(data.errors.map(e => e.error)));
        if (data.success.length === 0 && uniqueErrors.length === 1) {
          // Все заявки с одинаковой ошибкой
          if (uniqueErrors[0].includes('уже оплачен')) {
            toast.info('Все выбранные счета уже оплачены');
          } else if (uniqueErrors[0].includes('не найден')) {
            toast.warning('Для выбранных заявок счета не сформированы');
          } else {
            toast.warning(uniqueErrors[0]);
          }
        } else {
          // Разные ошибки или частичный успех
          const alreadyPaid = data.errors.filter(e => e.error.includes('уже оплачен')).length;
          const noInvoice = data.errors.filter(e => e.error.includes('не найден')).length;
          let details = [];
          if (alreadyPaid > 0) details.push(`уже оплачено: ${alreadyPaid}`);
          if (noInvoice > 0) details.push(`без счета: ${noInvoice}`);
          toast.warning(`Оплачено: ${data.success.length}. Пропущено: ${data.errors.length} (${details.join(', ')})`);
        }
      } else {
        toast.success(`Оплачено счетов: ${data.success.length}`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Ошибка при оплате счетов');
    },
  });
}

// Отметка одного счета как оплаченного (через invoices API)
export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) =>
      import('@/lib/api/invoices').then((mod) => mod.invoicesApi.markAsPaid(invoiceId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Счет отмечен как оплаченный');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Ошибка при оплате счета');
    },
  });
}
