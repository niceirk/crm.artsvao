import { create } from 'zustand';

/**
 * Данные о конфликте версий
 */
export interface ConflictData {
  entity: string;
  entityId: string;
  expectedVersion: number;
  currentVersion: number;
  serverData: any;
}

interface ConflictState {
  /** Данные текущего конфликта */
  conflict: ConflictData | null;
  /** Открыт ли диалог */
  isOpen: boolean;
  /** Установить конфликт и открыть диалог */
  setConflict: (data: ConflictData) => void;
  /** Закрыть диалог и очистить данные */
  clearConflict: () => void;
}

/**
 * Store для управления состоянием конфликтов оптимистичной блокировки.
 * Используется для отображения диалога при конфликте версий (409 Conflict).
 */
export const useConflictStore = create<ConflictState>((set) => ({
  conflict: null,
  isOpen: false,
  setConflict: (data) => set({ conflict: data, isOpen: true }),
  clearConflict: () => set({ conflict: null, isOpen: false }),
}));
