import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MessagesState {
  unreadCount: number;
  lastIncomingAt: string | null;
  lastIncomingConversationId: string | null;
  soundEnabled: boolean;
  setUnreadCount: (count: number) => void;
  setLastIncoming: (conversationId: string, createdAt: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
}

export const useMessagesStore = create<MessagesState>()(
  persist(
    (set) => ({
      unreadCount: 0,
      lastIncomingAt: null,
      lastIncomingConversationId: null,
      soundEnabled: true,
      setUnreadCount: (count) => set({ unreadCount: count }),
      setLastIncoming: (conversationId, createdAt) =>
        set({
          lastIncomingConversationId: conversationId,
          lastIncomingAt: createdAt,
        }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
    }),
    {
      name: 'messages-store',
      partialize: (state) => ({
        unreadCount: state.unreadCount,
        soundEnabled: state.soundEnabled,
      }),
    },
  ),
);
