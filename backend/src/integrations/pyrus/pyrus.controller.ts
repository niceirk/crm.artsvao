import { Controller, Get, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { PyrusService } from './pyrus.service';
import { ImportEventsDto, ImportResultDto, PyrusTaskPreviewDto } from './dto/import-events.dto';
import { SyncConflictsResponseDto, SyncWithResolutionDto } from './dto/sync-conflicts.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('integrations/pyrus')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PyrusController {
  private readonly logger = new Logger(PyrusController.name);

  constructor(private readonly pyrusService: PyrusService) {}

  /**
   * GET /integrations/pyrus/tasks
   * Получить предпросмотр задач из Pyrus для отображения в UI
   */
  @Get('tasks')
  async getTasks(): Promise<PyrusTaskPreviewDto[]> {
    this.logger.log('Запрос на получение задач из Pyrus');
    return this.pyrusService.getTasksPreview();
  }

  /**
   * POST /integrations/pyrus/import
   * Импортировать выбранные задачи или все задачи
   */
  @Post('import')
  async importEvents(@Body() dto: ImportEventsDto): Promise<ImportResultDto> {
    this.logger.log(
      `Запрос на импорт событий из Pyrus${dto.taskIds ? ` (выбрано ${dto.taskIds.length} задач)` : ' (все задачи)'}`,
    );
    return this.pyrusService.importEvents(dto);
  }

  /**
   * GET /integrations/pyrus/test-connection
   * Проверить подключение к Pyrus API
   */
  @Get('test-connection')
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.pyrusService.getAccessToken();
      return {
        success: true,
        message: 'Подключение к Pyrus API успешно установлено',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Ошибка подключения к Pyrus API',
      };
    }
  }

  /**
   * POST /integrations/pyrus/sync-rooms
   * Синхронизировать помещения из справочника Pyrus (односторонняя: Pyrus → Room)
   */
  @Post('sync-rooms')
  async syncRooms(): Promise<{ created: number; updated: number; errors: string[] }> {
    this.logger.log('Запрос на синхронизацию помещений из справочника Pyrus');
    return this.pyrusService.syncRoomsFromCatalog();
  }

  /**
   * POST /integrations/pyrus/sync-rooms-to-pyrus
   * Синхронизировать помещения в Pyrus (односторонняя: Room → Pyrus)
   */
  @Post('sync-rooms-to-pyrus')
  async syncRoomsToPyrus(): Promise<{ created: number; updated: number; errors: string[] }> {
    this.logger.log('Запрос на синхронизацию помещений в Pyrus');
    return this.pyrusService.syncRoomsToPyrus();
  }

  /**
   * POST /integrations/pyrus/sync-rooms-bidirectional
   * Двусторонняя синхронизация помещений (Pyrus ↔ Room)
   */
  @Post('sync-rooms-bidirectional')
  async syncRoomsBidirectional(): Promise<{
    fromPyrus: { created: number; updated: number; errors: string[] };
    toPyrus: { created: number; updated: number; errors: string[] };
  }> {
    this.logger.log('Запрос на двустороннюю синхронизацию помещений');
    return this.pyrusService.syncRoomsBidirectional();
  }

  /**
   * GET /integrations/pyrus/preview-rooms-sync
   * Предпросмотр синхронизации помещений - показывает конфликты
   */
  @Get('preview-rooms-sync')
  async previewRoomsSync(): Promise<{
    toCreate: { inPyrus: string[]; inCRM: string[] };
    conflicts: Array<{ name: string; existsInBoth: boolean }>;
  }> {
    this.logger.log('Запрос на предпросмотр синхронизации помещений');
    return this.pyrusService.previewRoomsSync();
  }

  /**
   * POST /integrations/pyrus/sync-event-types
   * Синхронизировать типы мероприятий из справочника Pyrus (односторонняя: Pyrus → EventType)
   */
  @Post('sync-event-types')
  async syncEventTypes(): Promise<{ created: number; updated: number; errors: string[] }> {
    this.logger.log('Запрос на синхронизацию типов мероприятий из справочника Pyrus');
    return this.pyrusService.syncEventTypesFromCatalog();
  }

  /**
   * POST /integrations/pyrus/sync-event-types-to-pyrus
   * Синхронизировать типы мероприятий в Pyrus (односторонняя: EventType → Pyrus)
   */
  @Post('sync-event-types-to-pyrus')
  async syncEventTypesToPyrus(): Promise<{ created: number; updated: number; errors: string[] }> {
    this.logger.log('Запрос на синхронизацию типов мероприятий в Pyrus');
    return this.pyrusService.syncEventTypesToPyrus();
  }

  /**
   * POST /integrations/pyrus/sync-event-types-bidirectional
   * Двусторонняя синхронизация типов мероприятий (Pyrus ↔ EventType)
   */
  @Post('sync-event-types-bidirectional')
  async syncEventTypesBidirectional(): Promise<{
    fromPyrus: { created: number; updated: number; errors: string[] };
    toPyrus: { created: number; updated: number; errors: string[] };
  }> {
    this.logger.log('Запрос на двустороннюю синхронизацию типов мероприятий');
    return this.pyrusService.syncEventTypesBidirectional();
  }

  /**
   * GET /integrations/pyrus/preview-event-types-sync
   * Предпросмотр синхронизации типов мероприятий - показывает конфликты
   */
  @Get('preview-event-types-sync')
  async previewEventTypesSync(): Promise<{
    toCreate: { inPyrus: string[]; inCRM: string[] };
    conflicts: Array<{ name: string; existsInBoth: boolean }>;
  }> {
    this.logger.log('Запрос на предпросмотр синхронизации типов мероприятий');
    return this.pyrusService.previewEventTypesSync();
  }

  /**
   * GET /integrations/pyrus/detect-conflicts
   * Обнаружить конфликты при синхронизации
   */
  @Get('detect-conflicts')
  async detectConflicts(): Promise<SyncConflictsResponseDto> {
    this.logger.log('Запрос на обнаружение конфликтов синхронизации');
    return this.pyrusService.detectSyncConflicts();
  }

  /**
   * POST /integrations/pyrus/sync-with-resolution
   * Синхронизация с разрешением конфликтов
   */
  @Post('sync-with-resolution')
  async syncWithResolution(@Body() dto: SyncWithResolutionDto): Promise<{
    eventTypes: { created: number; updated: number; skipped: number; errors: string[] };
    rooms: { created: number; updated: number; skipped: number; errors: string[] };
  }> {
    this.logger.log('Запрос на синхронизацию с разрешением конфликтов');
    return this.pyrusService.syncWithConflictResolution(dto);
  }
}
