import { apiClient } from './client';
import type {
  TelephonySettings,
  CallHistoryResponse,
  InitiateCallDto,
  InitiateCallResponse,
  UpdateSettingsDto,
  TestConnectionResponse,
  NovofonEmployee,
  NovofonVirtualNumber,
} from '../types/novofon';

const BASE_URL = '/integrations/novofon';

/**
 * Инициировать исходящий звонок
 */
export async function initiateCall(data: InitiateCallDto): Promise<InitiateCallResponse> {
  const response = await apiClient.post<InitiateCallResponse>(`${BASE_URL}/call`, data);
  return response.data;
}

/**
 * Получить историю звонков
 */
export async function getCallHistory(params?: {
  clientId?: string;
  limit?: number;
  offset?: number;
}): Promise<CallHistoryResponse> {
  const response = await apiClient.get<CallHistoryResponse>(`${BASE_URL}/history`, { params });
  return response.data;
}

/**
 * Получить настройки телефонии (только для админа)
 */
export async function getTelephonySettings(): Promise<TelephonySettings> {
  const response = await apiClient.get<TelephonySettings>(`${BASE_URL}/settings`);
  return response.data;
}

/**
 * Обновить настройки телефонии (только для админа)
 */
export async function updateTelephonySettings(
  data: UpdateSettingsDto
): Promise<TelephonySettings> {
  const response = await apiClient.patch<TelephonySettings>(`${BASE_URL}/settings`, data);
  return response.data;
}

/**
 * Тест подключения к Novofon API (только для админа)
 */
export async function testConnection(): Promise<TestConnectionResponse> {
  const response = await apiClient.get<TestConnectionResponse>(`${BASE_URL}/test`);
  return response.data;
}

/**
 * Получить список сотрудников из Novofon (только для админа)
 */
export async function getNovofonEmployees(): Promise<NovofonEmployee[]> {
  const response = await apiClient.get<NovofonEmployee[]>(`${BASE_URL}/employees`);
  return response.data;
}

/**
 * Получить виртуальные номера из Novofon (только для админа)
 */
export async function getNovofonVirtualNumbers(): Promise<NovofonVirtualNumber[]> {
  const response = await apiClient.get<NovofonVirtualNumber[]>(`${BASE_URL}/virtual-numbers`);
  return response.data;
}
