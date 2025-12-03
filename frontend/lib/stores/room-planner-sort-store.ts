import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RoomPlannerSortState {
  sortByIndex: boolean; // true = по sortOrder, false = по занятости
  setSortByIndex: (value: boolean) => void;
  toggleSortMode: () => void;
}

export const useRoomPlannerSortStore = create<RoomPlannerSortState>()(
  persist(
    (set) => ({
      sortByIndex: false, // По умолчанию сортировка по занятости

      setSortByIndex: (value: boolean) => set({ sortByIndex: value }),

      toggleSortMode: () =>
        set((state) => ({ sortByIndex: !state.sortByIndex })),
    }),
    {
      name: 'room-planner-sort-storage',
      partialize: (state) => ({
        sortByIndex: state.sortByIndex,
      }),
    }
  )
);
