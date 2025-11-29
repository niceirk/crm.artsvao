'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  initiateCall,
  getCallHistory,
  getTelephonySettings,
  updateTelephonySettings,
  testConnection,
  getNovofonEmployees,
  getNovofonVirtualNumbers,
} from '@/lib/api/novofon';
import type { InitiateCallDto, UpdateSettingsDto } from '@/lib/types/novofon';

// Query keys
export const novofonKeys = {
  all: ['novofon'] as const,
  history: (params?: { clientId?: string }) => [...novofonKeys.all, 'history', params] as const,
  settings: () => [...novofonKeys.all, 'settings'] as const,
  employees: () => [...novofonKeys.all, 'employees'] as const,
  virtualNumbers: () => [...novofonKeys.all, 'virtual-numbers'] as const,
};

/**
 * Хук для инициации звонка
 */
export function useInitiateCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InitiateCallDto) => initiateCall(data),
    onSuccess: () => {
      toast.success('Звонок инициирован', {
        description: 'Ожидайте входящий вызов на ваш телефон',
      });
      // Инвалидируем историю звонков
      queryClient.invalidateQueries({ queryKey: novofonKeys.all });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || error.message || 'Ошибка при звонке';
      toast.error('Не удалось позвонить', { description: message });
    },
  });
}

/**
 * Хук для получения истории звонков
 */
export function useCallHistory(params?: { clientId?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: novofonKeys.history(params),
    queryFn: () => getCallHistory(params),
  });
}

/**
 * Хук для получения настроек телефонии (только для админа)
 */
export function useTelephonySettings() {
  return useQuery({
    queryKey: novofonKeys.settings(),
    queryFn: getTelephonySettings,
  });
}

/**
 * Хук для обновления настроек телефонии (только для админа)
 */
export function useUpdateTelephonySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSettingsDto) => updateTelephonySettings(data),
    onSuccess: () => {
      toast.success('Настройки сохранены');
      queryClient.invalidateQueries({ queryKey: novofonKeys.settings() });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || error.message;
      toast.error('Ошибка при сохранении', { description: message });
    },
  });
}

/**
 * Хук для теста подключения (только для админа)
 */
export function useTestConnection() {
  return useMutation({
    mutationFn: testConnection,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Подключение успешно', { description: data.message });
      } else {
        toast.error('Ошибка подключения', { description: data.message });
      }
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || error.message;
      toast.error('Ошибка при проверке', { description: message });
    },
  });
}

/**
 * Хук для получения сотрудников из Novofon (только для админа)
 */
export function useNovofonEmployees(enabled = true) {
  return useQuery({
    queryKey: novofonKeys.employees(),
    queryFn: getNovofonEmployees,
    enabled,
  });
}

/**
 * Хук для получения виртуальных номеров из Novofon (только для админа)
 */
export function useNovofonVirtualNumbers(enabled = true) {
  return useQuery({
    queryKey: novofonKeys.virtualNumbers(),
    queryFn: getNovofonVirtualNumbers,
    enabled,
  });
}
