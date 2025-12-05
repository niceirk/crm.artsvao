import { create } from 'zustand';

interface RoomPlannerScrollStore {
  scrollLeft: number;
  setScrollLeft: (position: number) => void;
}

export const useRoomPlannerScrollStore = create<RoomPlannerScrollStore>((set) => ({
  scrollLeft: 0,
  setScrollLeft: (position) => set({ scrollLeft: position }),
}));
