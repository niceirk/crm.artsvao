import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetsApi } from '@/lib/api/timesheets';
import type { TimesheetFilterDto, UpdateCompensationDto } from '@/lib/types/timesheets';

export const timesheetKeys = {
  all: ['timesheets'] as const,
  timesheet: (filter: TimesheetFilterDto) => [...timesheetKeys.all, 'timesheet', filter] as const,
  studios: () => [...timesheetKeys.all, 'studios'] as const,
  groups: (studioId?: string) => [...timesheetKeys.all, 'groups', studioId] as const,
  recalculationDetails: (clientId: string, groupId: string, month: string) =>
    [...timesheetKeys.all, 'recalculation-details', clientId, groupId, month] as const,
};

/**
 * Получить табель посещаемости для группы за месяц
 */
export function useTimesheet(filter: TimesheetFilterDto) {
  return useQuery({
    queryKey: timesheetKeys.timesheet(filter),
    queryFn: () => timesheetsApi.getTimesheet(filter),
    enabled: !!filter.groupId,
    staleTime: 30000, // 30 секунд
  });
}

/**
 * Получить список студий для фильтра
 */
export function useTimesheetStudios() {
  return useQuery({
    queryKey: timesheetKeys.studios(),
    queryFn: () => timesheetsApi.getStudios(),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

/**
 * Получить список групп для фильтра
 */
export function useTimesheetGroups(studioId?: string) {
  return useQuery({
    queryKey: timesheetKeys.groups(studioId),
    queryFn: () => timesheetsApi.getGroups(studioId),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

/**
 * Обновить компенсацию (ручная корректировка с настройками перерасчёта)
 */
export function useUpdateCompensation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompensationDto }) =>
      timesheetsApi.updateCompensation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
    },
  });
}

/**
 * Создать или обновить компенсацию по clientId, groupId, month
 */
export function useUpsertCompensation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCompensationDto & { clientId: string; groupId: string; month: string }) =>
      timesheetsApi.upsertCompensation(data),
    onMutate: async (variables) => {
      // Отменяем исходящие запросы
      await queryClient.cancelQueries({ queryKey: timesheetKeys.all });

      // Сохраняем предыдущее состояние для отката
      const previousTimesheet = queryClient.getQueryData(
        timesheetKeys.timesheet({ groupId: variables.groupId, month: variables.month })
      );

      // Оптимистично обновляем данные в кеше
      queryClient.setQueryData(
        timesheetKeys.timesheet({ groupId: variables.groupId, month: variables.month }),
        (old: any) => {
          if (!old) return old;

          return {
            ...old,
            clients: old.clients.map((client: any) => {
              if (client.id !== variables.clientId) return client;

              // Рассчитываем новый перерасчёт на основе настроек
              const baseAmount = variables.includeExcused ? (variables.baseAmount || 0) : 0;
              const medCertAmount = variables.includeMedCert ? (variables.medCertAmount || 0) : 0;
              const cancelledAmount = variables.includeCancelled ? (variables.cancelledAmount || 0) : 0;
              const debtAmount = variables.debtAmount || 0;
              const effectiveRecalculation = variables.adjustedAmount ?? (baseAmount + medCertAmount + cancelledAmount - debtAmount);

              return {
                ...client,
                compensation: {
                  ...client.compensation,
                  effectiveRecalculationAmount: effectiveRecalculation,
                  adjustedAmount: variables.adjustedAmount ?? null,
                  notes: variables.notes,
                  includeExcused: variables.includeExcused,
                  includeMedCert: variables.includeMedCert,
                  includeCancelled: variables.includeCancelled,
                  excludedInvoiceIds: variables.excludedInvoiceIds,
                },
              };
            }),
          };
        }
      );

      return { previousTimesheet };
    },
    onError: (_err, variables, context) => {
      // Откатываем при ошибке
      if (context?.previousTimesheet) {
        queryClient.setQueryData(
          timesheetKeys.timesheet({ groupId: variables.groupId, month: variables.month }),
          context.previousTimesheet
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      // Инвалидируем (но не ждём) для фоновой синхронизации
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
      queryClient.invalidateQueries({
        queryKey: timesheetKeys.recalculationDetails(variables.clientId, variables.groupId, variables.month),
      });
    },
  });
}

/**
 * Получить детализацию перерасчёта для клиента
 */
export function useRecalculationDetails(
  clientId: string | null,
  groupId: string | null,
  month: string | null
) {
  return useQuery({
    queryKey: timesheetKeys.recalculationDetails(clientId!, groupId!, month!),
    queryFn: () => timesheetsApi.getRecalculationDetails(clientId!, groupId!, month!),
    enabled: !!clientId && !!groupId && !!month,
    staleTime: 60000, // 1 минута кеширования
  });
}
