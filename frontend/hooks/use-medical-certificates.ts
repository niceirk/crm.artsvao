'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicalCertificatesApi } from '@/lib/api/medical-certificates';
import {
  MedicalCertificateFilter,
  CreateMedicalCertificateDto,
  UpdateMedicalCertificateDto,
  ApplyToSchedulesDto,
} from '@/lib/types/medical-certificates';
import { toast } from 'sonner';

const QUERY_KEY = 'medical-certificates';

/**
 * Хук для получения списка справок с фильтрацией
 */
export function useMedicalCertificates(filter?: MedicalCertificateFilter) {
  return useQuery({
    queryKey: [QUERY_KEY, filter],
    queryFn: () => medicalCertificatesApi.getAll(filter),
  });
}

/**
 * Хук для получения справки по ID
 */
export function useMedicalCertificate(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => medicalCertificatesApi.getById(id!),
    enabled: !!id,
  });
}

/**
 * Хук для получения справок клиента
 */
export function useClientMedicalCertificates(clientId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'client', clientId],
    queryFn: () => medicalCertificatesApi.getByClient(clientId!),
    enabled: !!clientId,
  });
}

/**
 * Хук для предпросмотра занятий клиента за период
 */
export function usePreviewSchedules(
  clientId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined,
) {
  return useQuery({
    queryKey: [QUERY_KEY, 'preview', clientId, startDate, endDate],
    queryFn: () => medicalCertificatesApi.previewSchedules(clientId!, startDate!, endDate!),
    enabled: !!clientId && !!startDate && !!endDate,
  });
}

/**
 * Хук для создания справки
 */
export function useCreateMedicalCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, data }: { file?: File; data: CreateMedicalCertificateDto }) =>
      medicalCertificatesApi.create(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Справка успешно создана');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при создании справки');
    },
  });
}

/**
 * Хук для обновления справки
 */
export function useUpdateMedicalCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMedicalCertificateDto }) =>
      medicalCertificatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Справка обновлена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при обновлении справки');
    },
  });
}

/**
 * Хук для удаления справки
 */
export function useDeleteMedicalCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => medicalCertificatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Справка удалена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при удалении справки');
    },
  });
}

/**
 * Хук для применения статуса EXCUSED к занятиям
 * Поддерживает передачу информации о месяцах компенсации
 */
export function useApplyToSchedules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ApplyToSchedulesDto }) =>
      medicalCertificatesApi.applyToSchedules(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success(`Статус применен к ${data.applied} занятиям`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при применении статуса');
    },
  });
}

/**
 * Хук для получения доступных периодов (года и месяцы)
 */
export function useAvailablePeriods() {
  return useQuery({
    queryKey: [QUERY_KEY, 'available-periods'],
    queryFn: () => medicalCertificatesApi.getAvailablePeriods(),
  });
}
