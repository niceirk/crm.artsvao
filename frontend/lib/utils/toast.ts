import { toast as sonnerToast, ExternalToast } from 'sonner';

/**
 * Централизованный модуль для Toast уведомлений
 * Использует Sonner для единообразного отображения уведомлений по всему приложению
 */

export interface ToastOptions extends ExternalToast {
  description?: string;
}

/**
 * Глобальные настройки для всех toast уведомлений
 */
const defaultOptions: ExternalToast = {
  duration: 4000,
  position: 'top-right',
};

/**
 * Объект с типизированными методами для показа toast уведомлений
 */
export const toast = {
  /**
   * Показать уведомление об успехе
   */
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      ...defaultOptions,
      ...options,
    });
  },

  /**
   * Показать уведомление об ошибке
   */
  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      ...defaultOptions,
      ...options,
    });
  },

  /**
   * Показать информационное уведомление
   */
  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      ...defaultOptions,
      ...options,
    });
  },

  /**
   * Показать предупреждающее уведомление
   */
  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      ...defaultOptions,
      ...options,
    });
  },

  /**
   * Показать обычное уведомление без иконки
   */
  message: (message: string, options?: ToastOptions) => {
    return sonnerToast(message, {
      ...defaultOptions,
      ...options,
    });
  },

  /**
   * Показать уведомление с промисом (loading -> success/error)
   */
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error,
      ...defaultOptions,
    });
  },

  /**
   * Закрыть конкретный toast по ID
   */
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },
};
