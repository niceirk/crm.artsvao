import { create } from 'zustand';
import type { Activity } from '@/hooks/use-room-planner';

interface ClipboardData {
  activity: Activity;
  copiedAt: Date;
}

interface ActivityClipboardStore {
  clipboard: ClipboardData | null;
  copyActivity: (activity: Activity) => void;
  clearClipboard: () => void;
  hasClipboard: () => boolean;
}

export const useActivityClipboardStore = create<ActivityClipboardStore>((set, get) => ({
  clipboard: null,

  copyActivity: (activity: Activity) => {
    // Копируем только rental и reservation
    if (activity.type !== 'rental' && activity.type !== 'reservation') {
      return;
    }
    set({
      clipboard: {
        activity,
        copiedAt: new Date(),
      },
    });
  },

  clearClipboard: () => set({ clipboard: null }),

  hasClipboard: () => get().clipboard !== null,
}));
