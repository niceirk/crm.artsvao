import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useMessagesStore } from '@/lib/stores/messages-store';
import { getUnreadMessagesCount } from '@/lib/api/messages';

const STREAM_PATH = '/messages/stream';
const DEFAULT_API_URL = 'http://localhost:3000/api';

/**
 * Глобальная подписка на SSE событий сообщений.
 * Использование: монтируется один раз в (dashboard)/layout.tsx.
 */
export function useMessagesNotifications() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUnreadCount = useMessagesStore((state) => state.setUnreadCount);
  const setLastIncoming = useMessagesStore((state) => state.setLastIncoming);
  const soundEnabled = useMessagesStore((state) => state.soundEnabled);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userInteractedRef = useRef(false);

  useEffect(() => {
    const handleUserInteraction = () => {
      userInteractedRef.current = true;
    };
    window.addEventListener('pointerdown', handleUserInteraction, { once: true });
    return () => window.removeEventListener('pointerdown', handleUserInteraction);
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    let eventSource: EventSource | null = null;
    let closed = false;
    let reconnectDelay = 2000;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
    const buildUrl = () => {
      const base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      return `${base}${STREAM_PATH}?token=${accessToken}`;
    };

    const playSound = () => {
      if (!soundEnabled || !userInteractedRef.current) return;
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/Telegram.mp3');
      }
      audioRef.current.play().catch(() => {
        // Игнорируем ошибки автоплея
      });
    };

    const handleEvent = (event: MessageEvent) => {
      if (!event.data) return;
      let payload: any;
      try {
        payload = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      if (payload.type === 'unread-count') {
        setUnreadCount(payload.count ?? 0);
      }

      if (payload.type === 'new-message') {
        if (payload.conversationId && payload.createdAt) {
          setLastIncoming(payload.conversationId, payload.createdAt);
          playSound();
        }
      }
    };

    const startPollingFallback = () => {
      // Раз в минуту обновляем счётчик, если SSE не работает
      if (pollTimer) return;
      pollTimer = setInterval(async () => {
        try {
          const count = await getUnreadMessagesCount();
          setUnreadCount(count);
        } catch (e) {
          // тихо
        }
      }, 60000);
    };

    const stopPollingFallback = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const connect = () => {
      if (closed) return;
      eventSource = new EventSource(buildUrl());

      eventSource.onopen = () => {
        reconnectDelay = 2000;
        stopPollingFallback();
      };

      eventSource.onmessage = handleEvent;

      eventSource.onerror = () => {
        eventSource?.close();
        startPollingFallback();
        if (closed) return;
        setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      };
    };

    // Первичный REST для актуального счётчика
    getUnreadMessagesCount()
      .then((count) => setUnreadCount(count))
      .catch(() => {
        // ignore
      });

    connect();

    return () => {
      closed = true;
      eventSource?.close();
      stopPollingFallback();
    };
  }, [accessToken, setUnreadCount, setLastIncoming, soundEnabled]);
}
