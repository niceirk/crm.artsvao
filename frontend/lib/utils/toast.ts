import { toast as sonnerToast, ExternalToast } from 'sonner';

/**
 * Централизованный модуль для Toast уведомлений
 * Использует Sonner для единообразного отображения уведомлений по всему приложению
 */

/**
 * Извлекает понятное сообщение об ошибке из различных форматов ответа API
 */
export function getErrorMessage(error: unknown, fallback = 'Произошла ошибка'): string {
  if (!error) return fallback;

  // Axios/fetch error response
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, any>;

    // NestJS validation error (массив сообщений)
    if (err.response?.data?.message) {
      const message = err.response.data.message;
      if (Array.isArray(message)) {
        return message[0] || fallback;
      }
      return message;
    }

    // Стандартный Error
    if (err.message && typeof err.message === 'string') {
      // Не показываем технические сообщения
      if (err.message.includes('Network Error')) {
        return 'Ошибка сети. Проверьте подключение к интернету';
      }
      if (err.message.includes('timeout')) {
        return 'Превышено время ожидания. Попробуйте ещё раз';
      }
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        return 'Сессия истекла. Войдите в систему заново';
      }
      if (err.message.includes('403') || err.message.includes('Forbidden')) {
        return 'Недостаточно прав для выполнения операции';
      }
      if (err.message.includes('404') || err.message.includes('Not Found')) {
        return 'Запрашиваемый ресурс не найден';
      }
      if (err.message.includes('429')) {
        return 'Слишком много запросов. Подождите немного';
      }
      if (err.message.includes('500') || err.message.includes('Internal Server')) {
        return 'Внутренняя ошибка сервера. Попробуйте позже';
      }
      return err.message;
    }

    // axios error code
    if (err.code === 'ERR_NETWORK') {
      return 'Ошибка сети. Проверьте подключение к интернету';
    }
    if (err.code === 'ECONNABORTED') {
      return 'Превышено время ожидания. Попробуйте ещё раз';
    }
  }

  // Строковая ошибка
  if (typeof error === 'string') {
    return error;
  }

  return fallback;
}

/**
 * Показывает toast с ошибкой, автоматически извлекая сообщение
 */
export function showErrorToast(error: unknown, fallback = 'Произошла ошибка') {
  const message = getErrorMessage(error, fallback);
  return sonnerToast.error(message);
}

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
