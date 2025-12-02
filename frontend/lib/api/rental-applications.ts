import { apiClient } from './client';
import {
  RentalApplication,
  CreateRentalApplicationDto,
  UpdateRentalApplicationDto,
  CheckAvailabilityDto,
  CalculatePriceDto,
  ExtendRentalDto,
  CancelRentalDto,
  RentalApplicationFilters,
  AvailabilityResult,
  PriceCalculation,
  EditStatusResult,
} from '../types/rental-applications';

export const rentalApplicationsApi = {
  // Получить все заявки
  getAll: async (filters?: RentalApplicationFilters): Promise<RentalApplication[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.rentalType) params.append('rentalType', filters.rentalType);
    if (filters?.clientId) params.append('clientId', filters.clientId);
    if (filters?.roomId) params.append('roomId', filters.roomId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get(`/rental-applications?${params.toString()}`);
    return response.data;
  },

  // Получить одну заявку
  getOne: async (id: string): Promise<RentalApplication> => {
    const response = await apiClient.get(`/rental-applications/${id}`);
    return response.data;
  },

  // Создать заявку
  create: async (data: CreateRentalApplicationDto): Promise<RentalApplication> => {
    const response = await apiClient.post('/rental-applications', data);
    return response.data;
  },

  // Обновить заявку
  update: async (id: string, data: UpdateRentalApplicationDto): Promise<RentalApplication> => {
    const response = await apiClient.patch(`/rental-applications/${id}`, data);
    return response.data;
  },

  // Подтвердить заявку
  confirm: async (id: string): Promise<RentalApplication> => {
    const response = await apiClient.post(`/rental-applications/${id}/confirm`);
    return response.data;
  },

  // Продлить заявку
  extend: async (id: string, data: ExtendRentalDto): Promise<RentalApplication> => {
    const response = await apiClient.post(`/rental-applications/${id}/extend`, data);
    return response.data;
  },

  // Отменить заявку
  cancel: async (id: string, data?: CancelRentalDto): Promise<RentalApplication> => {
    const response = await apiClient.post(`/rental-applications/${id}/cancel`, data || {});
    return response.data;
  },

  // Удалить заявку
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/rental-applications/${id}`);
  },

  // Проверить доступность
  checkAvailability: async (data: CheckAvailabilityDto): Promise<AvailabilityResult> => {
    const response = await apiClient.post('/rental-applications/check-availability', data);
    return response.data;
  },

  // Рассчитать цену
  calculatePrice: async (data: CalculatePriceDto): Promise<PriceCalculation> => {
    const response = await apiClient.post('/rental-applications/calculate-price', data);
    return response.data;
  },

  // Получить статус возможности редактирования
  getEditStatus: async (id: string): Promise<EditStatusResult> => {
    const response = await apiClient.get(`/rental-applications/${id}/edit-status`);
    return response.data;
  },
};
