import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RoomPlannerScaleState {
  scale: number;
  setScale: (scale: number) => void;
  increaseScale: () => void;
  decreaseScale: () => void;
  resetScale: () => void;
}

const MIN_SCALE = 0.9; // 90%
const MAX_SCALE = 1.3; // 130%
const DEFAULT_SCALE = 1.0; // 100%
const SCALE_STEP = 0.1; // 10%

export const useRoomPlannerScaleStore = create<RoomPlannerScaleState>()(
  persist(
    (set) => ({
      scale: DEFAULT_SCALE,

      setScale: (scale: number) => {
        // Ограничиваем значение в заданном диапазоне
        const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
        // Округляем до одного знака после запятой
        const roundedScale = Math.round(clampedScale * 10) / 10;
        set({ scale: roundedScale });
      },

      increaseScale: () =>
        set((state) => {
          const newScale = state.scale + SCALE_STEP;
          const clampedScale = Math.min(MAX_SCALE, newScale);
          const roundedScale = Math.round(clampedScale * 10) / 10;
          return { scale: roundedScale };
        }),

      decreaseScale: () =>
        set((state) => {
          const newScale = state.scale - SCALE_STEP;
          const clampedScale = Math.max(MIN_SCALE, newScale);
          const roundedScale = Math.round(clampedScale * 10) / 10;
          return { scale: roundedScale };
        }),

      resetScale: () => set({ scale: DEFAULT_SCALE }),
    }),
    {
      name: 'room-planner-scale-storage',
      partialize: (state) => ({
        scale: state.scale,
      }),
    }
  )
);
