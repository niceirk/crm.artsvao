import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NavigationStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  expandedMenus: Set<string>;
  toggleMenu: (key: string) => void;
  setMenuExpanded: (key: string, expanded: boolean) => void;
}

export const useNavigationStore = create<NavigationStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      mobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      expandedMenus: new Set<string>(),
      toggleMenu: (key) =>
        set((state) => {
          const newExpanded = new Set(state.expandedMenus);
          if (newExpanded.has(key)) {
            newExpanded.delete(key);
          } else {
            newExpanded.add(key);
          }
          return { expandedMenus: newExpanded };
        }),
      setMenuExpanded: (key, expanded) =>
        set((state) => {
          const newExpanded = new Set(state.expandedMenus);
          if (expanded) {
            newExpanded.add(key);
          } else {
            newExpanded.delete(key);
          }
          return { expandedMenus: newExpanded };
        }),
    }),
    {
      name: 'navigation-storage',
      // Сохраняем состояние сворачивания sidebar и раскрытых меню
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        expandedMenus: Array.from(state.expandedMenus),
      }),
      // Десериализация Set из массива
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as any),
        expandedMenus: new Set((persistedState as any)?.expandedMenus || []),
      }),
    }
  )
);
