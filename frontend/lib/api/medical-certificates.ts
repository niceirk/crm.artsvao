import { apiClient } from './client';
import {
  MedicalCertificate,
  MedicalCertificatesResponse,
  MedicalCertificateFilter,
  CreateMedicalCertificateDto,
  UpdateMedicalCertificateDto,
  SchedulePreview,
  ApplyToSchedulesDto,
  ApplyToSchedulesResponse,
  MedicalCertificateSchedule,
  AvailablePeriodsResponse,
} from '../types/medical-certificates';

export const medicalCertificatesApi = {
  /**
   * Получить список справок с фильтрацией
   */
  getAll: async (params?: MedicalCertificateFilter): Promise<MedicalCertificatesResponse> => {
    const response = await apiClient.get<MedicalCertificatesResponse>('/medical-certificates', { params });
    return response.data;
  },

  /**
   * Получить справку по ID
   */
  getById: async (id: string): Promise<MedicalCertificate> => {
    const response = await apiClient.get<MedicalCertificate>(`/medical-certificates/${id}`);
    return response.data;
  },

  /**
   * Получить справки клиента
   */
  getByClient: async (clientId: string): Promise<MedicalCertificate[]> => {
    const response = await apiClient.get<MedicalCertificate[]>(`/medical-certificates/client/${clientId}`);
    return response.data;
  },

  /**
   * Создать справку (файл опциональный)
   */
  create: async (
    data: CreateMedicalCertificateDto,
    file?: File,
  ): Promise<MedicalCertificate> => {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    formData.append('clientId', data.clientId);
    formData.append('startDate', data.startDate);
    formData.append('endDate', data.endDate);
    if (data.notes) {
      formData.append('notes', data.notes);
    }
    if (data.scheduleIds && data.scheduleIds.length > 0) {
      data.scheduleIds.forEach((id) => {
        formData.append('scheduleIds[]', id);
      });
    }
    if (data.compensationMonths && data.compensationMonths.length > 0) {
      formData.append('compensationMonths', JSON.stringify(data.compensationMonths));
    }

    const response = await apiClient.post<MedicalCertificate>('/medical-certificates', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Обновить справку
   */
  update: async (id: string, data: UpdateMedicalCertificateDto): Promise<MedicalCertificate> => {
    const response = await apiClient.patch<MedicalCertificate>(`/medical-certificates/${id}`, data);
    return response.data;
  },

  /**
   * Удалить справку
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/medical-certificates/${id}`);
  },

  /**
   * Предпросмотр занятий клиента за период
   */
  previewSchedules: async (
    clientId: string,
    startDate: string,
    endDate: string,
  ): Promise<SchedulePreview[]> => {
    const response = await apiClient.get<SchedulePreview[]>('/medical-certificates/preview-schedules', {
      params: { clientId, startDate, endDate },
    });
    return response.data;
  },

  /**
   * Применить статус EXCUSED к занятиям
   * @param id - ID справки
   * @param dto - Данные о занятиях и компенсациях
   */
  applyToSchedules: async (
    id: string,
    dto: ApplyToSchedulesDto,
  ): Promise<ApplyToSchedulesResponse> => {
    const response = await apiClient.post<ApplyToSchedulesResponse>(
      `/medical-certificates/${id}/apply`,
      dto,
    );
    return response.data;
  },

  /**
   * Получить занятия, к которым применена справка
   */
  getAppliedSchedules: async (id: string): Promise<MedicalCertificateSchedule[]> => {
    const response = await apiClient.get<MedicalCertificateSchedule[]>(
      `/medical-certificates/${id}/schedules`,
    );
    return response.data;
  },

  /**
   * Получить доступные периоды (года и месяцы)
   */
  getAvailablePeriods: async (): Promise<AvailablePeriodsResponse> => {
    const response = await apiClient.get<AvailablePeriodsResponse>(
      '/medical-certificates/available-periods',
    );
    return response.data;
  },
};
