import { apiClient } from './client';

export interface PyrusTaskPreview {
  id: number;
  text: string;
  createDate: string;
  lastModifiedDate: string;
  fields: Array<{
    id: number;
    name?: string;
    type: string;
    value?: any;
  }>;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{
    taskId: number;
    error: string;
  }>;
}

export interface ImportEventsRequest {
  taskIds?: number[];
}

/**
 * Получить список задач из Pyrus для предпросмотра
 */
export async function fetchPyrusTasks(): Promise<PyrusTaskPreview[]> {
  const response = await apiClient.get('/integrations/pyrus/tasks');
  return response.data;
}

/**
 * Импортировать выбранные задачи из Pyrus
 * @param taskIds - Массив ID задач для импорта. Если не указан, импортируются все задачи
 */
export async function importPyrusTasks(taskIds?: number[]): Promise<ImportResult> {
  const response = await apiClient.post('/integrations/pyrus/import', {
    taskIds,
  });
  return response.data;
}

/**
 * Проверить подключение к Pyrus API
 */
export async function testPyrusConnection(): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.get('/integrations/pyrus/test-connection');
  return response.data;
}

export interface SyncResult {
  created: number;
  updated: number;
  errors: string[];
}

export interface BidirectionalSyncResult {
  fromPyrus: SyncResult;
  toPyrus: SyncResult;
}

/**
 * Синхронизировать помещения из справочника Pyrus (Pyrus → Room)
 */
export async function syncRoomsFromPyrus(): Promise<SyncResult> {
  const response = await apiClient.post('/integrations/pyrus/sync-rooms');
  return response.data;
}

/**
 * Синхронизировать помещения в Pyrus (Room → Pyrus)
 */
export async function syncRoomsToPyrus(): Promise<SyncResult> {
  const response = await apiClient.post('/integrations/pyrus/sync-rooms-to-pyrus');
  return response.data;
}

/**
 * Двусторонняя синхронизация помещений (Pyrus ↔ Room)
 */
export async function syncRoomsBidirectional(): Promise<BidirectionalSyncResult> {
  const response = await apiClient.post('/integrations/pyrus/sync-rooms-bidirectional');
  return response.data;
}

/**
 * Синхронизировать типы мероприятий из справочника Pyrus (Pyrus → EventType)
 */
export async function syncEventTypesFromPyrus(): Promise<SyncResult> {
  const response = await apiClient.post('/integrations/pyrus/sync-event-types');
  return response.data;
}

/**
 * Синхронизировать типы мероприятий в Pyrus (EventType → Pyrus)
 */
export async function syncEventTypesToPyrus(): Promise<SyncResult> {
  const response = await apiClient.post('/integrations/pyrus/sync-event-types-to-pyrus');
  return response.data;
}

/**
 * Двусторонняя синхронизация типов мероприятий (Pyrus ↔ EventType)
 */
export async function syncEventTypesBidirectional(): Promise<BidirectionalSyncResult> {
  const response = await apiClient.post('/integrations/pyrus/sync-event-types-bidirectional');
  return response.data;
}

/**
 * Типы для обнаружения и разрешения конфликтов
 */
export interface EventTypeConflict {
  id: string;
  pyrusId: string;
  crmData: {
    name: string;
    description?: string;
    color?: string;
    updatedAt: string;
  };
  pyrusData: {
    name: string;
  };
  lastSyncedAt?: string;
}

export interface RoomConflict {
  id: string;
  pyrusId: string;
  crmData: {
    name: string;
    updatedAt: string;
  };
  pyrusData: {
    name: string;
  };
  lastSyncedAt?: string;
}

export interface SyncConflictsResponse {
  eventTypeConflicts: EventTypeConflict[];
  roomConflicts: RoomConflict[];
  hasConflicts: boolean;
}

export enum ConflictResolution {
  USE_CRM = 'USE_CRM',
  USE_PYRUS = 'USE_PYRUS',
  SKIP = 'SKIP',
}

export interface ConflictResolutionItem {
  id: string;
  resolution: ConflictResolution;
}

export interface SyncWithResolutionRequest {
  eventTypeResolutions?: ConflictResolutionItem[];
  roomResolutions?: ConflictResolutionItem[];
}

export interface SyncWithResolutionResult {
  eventTypes: {
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
  rooms: {
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
}

/**
 * Обнаружить конфликты при синхронизации
 */
export async function detectSyncConflicts(): Promise<SyncConflictsResponse> {
  const response = await apiClient.get('/integrations/pyrus/detect-conflicts');
  return response.data;
}

/**
 * Синхронизация с разрешением конфликтов
 */
export async function syncWithResolution(
  request: SyncWithResolutionRequest
): Promise<SyncWithResolutionResult> {
  const response = await apiClient.post('/integrations/pyrus/sync-with-resolution', request);
  return response.data;
}
