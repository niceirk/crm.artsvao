import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useQueryClient } from '@tanstack/react-query';

const STREAM_PATH = '/data-events/stream';
const DEFAULT_API_URL = 'http://localhost:3000/api';

/**
 * Глобальная подписка на SSE события изменения данных.
 * Автоматически инвалидирует кэш React Query при получении событий.
 *
 * @param entities - Список сущностей для отслеживания (опционально)
 *
 * Использование: монтируется один раз в (dashboard)/layout.tsx.
 *
 * @example
 * // Подписка на все события
 * useDataEvents();
 *
 * @example
 * // Подписка только на определённые сущности
 * useDataEvents(['subscription', 'attendance', 'invoice']);
 */
export function useDataEvents(entities?: string[]) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  // Используем ref для entities чтобы избежать пересоздания EventSource при изменении массива
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;

  useEffect(() => {
    if (!accessToken) return;

    let eventSource: EventSource | null = null;
    let closed = false;
    let reconnectDelay = 2000;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

    const buildUrl = () => {
      const base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      const entitiesParam = entitiesRef.current?.join(',') || '';
      return `${base}${STREAM_PATH}?token=${accessToken}${entitiesParam ? `&entities=${entitiesParam}` : ''}`;
    };

    const handleEvent = (event: MessageEvent) => {
      if (!event.data) return;

      let payload: any = null;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload?.entity && payload?.entityId) {
        // Инвалидируем кэш для изменённой сущности
        queryClient.invalidateQueries({ queryKey: [payload.entity] });
        queryClient.invalidateQueries({ queryKey: [payload.entity, payload.entityId] });

        // Также инвалидируем связанные сущности
        // Например, при изменении attendance инвалидируем schedule и subscription
        if (payload.entity === 'attendance') {
          queryClient.invalidateQueries({ queryKey: ['schedules'] });
          queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
        }
        if (payload.entity === 'payment') {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }
      }
    };

    const connect = () => {
      if (closed) return;

      eventSource = new EventSource(buildUrl());

      eventSource.onmessage = handleEvent;

      eventSource.onopen = () => {
        // Сброс задержки при успешном подключении
        reconnectDelay = 2000;
      };

      eventSource.onerror = () => {
        eventSource?.close();
        if (closed) return;
        // Экспоненциальный backoff для переподключения
        setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      };
    };

    connect();

    return () => {
      closed = true;
      eventSource?.close();
    };
  }, [accessToken, queryClient]);
}
