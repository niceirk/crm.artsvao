import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PyrusAuthResponse,
  PyrusTask,
  PyrusTasksResponse,
  PyrusFormRegisterParams,
  PyrusField,
  PyrusCatalog,
  PyrusCatalogItem,
  PyrusCatalogDiffResponse,
} from './interfaces/pyrus-api.interface';
import { ImportEventsDto, ImportResultDto, PyrusTaskPreviewDto } from './dto/import-events.dto';
import {
  SyncConflictsResponseDto,
  EventTypeConflictDto,
  RoomConflictDto,
  ConflictResolution,
  SyncWithResolutionDto,
} from './dto/sync-conflicts.dto';
import { CreateEventDto } from '../../events/dto/create-event.dto';
import { EventsService } from '../../events/events.service';

/**
 * Вычисляет схожесть двух строк (0 = полностью разные, 1 = идентичные)
 * Использует алгоритм Levenshtein distance
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Проверка на вхождение одной строки в другую
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8; // Высокая схожесть если одна строка содержит другую
  }

  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

@Injectable()
export class PyrusService {
  private readonly logger = new Logger(PyrusService.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly AUTH_URL = 'https://accounts.pyrus.com/api/v4/auth';
  private readonly API_BASE_URL = 'https://api.pyrus.com/v4';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Получить токен доступа Pyrus (с кэшированием)
   */
  async getAccessToken(): Promise<string> {
    // Проверяем кэшированный токен
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    this.logger.log('Получение нового токена доступа Pyrus...');

    const login = this.configService.get<string>('PYRUS_LOGIN');
    const securityKey = this.configService.get<string>('PYRUS_SECURITY_KEY');

    if (!login || !securityKey) {
      throw new BadRequestException(
        'Не настроены учетные данные Pyrus. Проверьте PYRUS_LOGIN и PYRUS_SECURITY_KEY в .env',
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<PyrusAuthResponse>(this.AUTH_URL, {
          login,
          security_key: securityKey,
        }),
      );

      this.accessToken = response.data.access_token;
      // Токен действует около 1 часа, но обновим его заранее через 50 минут
      this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);

      this.logger.log('Токен доступа Pyrus успешно получен');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Ошибка при получении токена Pyrus', error.response?.data || error.message);
      throw new BadRequestException('Не удалось авторизоваться в Pyrus API');
    }
  }

  /**
   * Получить задачи из формы Pyrus
   */
  async getFormTasks(filters?: PyrusFormRegisterParams): Promise<PyrusTask[]> {
    const token = await this.getAccessToken();
    const formId = this.configService.get<string>('PYRUS_FORM_ID');

    if (!formId) {
      throw new BadRequestException('Не настроен PYRUS_FORM_ID в .env');
    }

    this.logger.log(`Получение задач из формы ${formId}...`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<PyrusTasksResponse>(
          `${this.API_BASE_URL}/forms/${formId}/register`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: filters,
          },
        ),
      );

      const tasks = response.data.tasks || [];
      this.logger.log(`Получено ${tasks.length} задач из Pyrus`);

      // Логируем структуру первой задачи для отладки маппинга полей
      if (tasks.length > 0) {
        const firstTask = tasks[0];
        this.logger.log('=== Структура первой задачи ===');
        this.logger.log(`ID задачи: ${firstTask.id}`);
        this.logger.log(`Текст задачи: ${firstTask.text}`);
        this.logger.log('Поля задачи:');
        firstTask.fields.forEach((field) => {
          this.logger.log(
            `  - Поле ID ${field.id} (${field.name || 'без имени'}): тип="${field.type}", значение="${JSON.stringify(field.value)}"`,
          );
        });
        this.logger.log('================================');
      }

      return tasks;
    } catch (error) {
      this.logger.error('Ошибка при получении задач из Pyrus', error.response?.data || error.message);
      throw new BadRequestException('Не удалось получить задачи из Pyrus');
    }
  }

  /**
   * Получить предпросмотр задач для UI
   */
  async getTasksPreview(): Promise<PyrusTaskPreviewDto[]> {
    const tasks = await this.getFormTasks({
      item_count: 20000, // Максимальный лимит Pyrus API
      include_archived: 'y', // Включить все задачи, включая архивные
    });

    return tasks.map((task) => ({
      id: task.id,
      text: task.text,
      createDate: task.create_date,
      lastModifiedDate: task.last_modified_date,
      fields: task.fields.map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type,
        value: field.value,
      })),
    }));
  }

  /**
   * Получить значение поля из задачи Pyrus
   */
  private getFieldValue(fields: PyrusField[], fieldId: number): any {
    const field = fields.find((f) => f.id === fieldId);
    return field?.value;
  }

  /**
   * Парсинг времени из строки Pyrus (формат может быть "HH:MM" или полная дата)
   * Pyrus API возвращает время в UTC, конвертируем в московское время (UTC+3)
   */
  private parseTime(timeValue: any): string | null {
    if (!timeValue) return null;

    // Если это строка, пытаемся извлечь время
    if (typeof timeValue === 'string') {
      // Если формат "HH:MM" или "HH:MM:SS"
      const timeMatch = timeValue.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
      if (timeMatch) {
        const utcHours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const seconds = timeMatch[3] || '00';

        // Конвертируем UTC в MSK (UTC+3)
        const mskHours = (utcHours + 3) % 24;

        return `${String(mskHours).padStart(2, '0')}:${minutes}:${seconds}`;
      }
    }

    return null;
  }

  /**
   * Парсинг boolean поля из Pyrus (flag type)
   * В Pyrus flag поле может быть: true, "true", "yes", 1, или "checked"
   */
  private parseBooleanField(value: any): boolean {
    if (!value) return false;

    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      return lowerValue === 'true' || lowerValue === 'yes' || lowerValue === 'checked' || lowerValue === '1';
    }

    return false;
  }

  /**
   * Маппинг задачи Pyrus → Event
   */
  private async mapPyrusTaskToEvent(task: PyrusTask): Promise<CreateEventDto & { externalId: string }> {
    const fields = task.fields;

    // Маппинг полей формы Pyrus на поля Event
    // Приоритет: поле 60 (Название для расписания) → поле 1 (Название мероприятия)
    const scheduleName = this.getFieldValue(fields, 60); // Название для расписания
    const eventName = this.getFieldValue(fields, 1); // Название мероприятия
    const name = scheduleName || eventName || task.text || `Мероприятие #${task.id}`;

    const description = this.getFieldValue(fields, 2); // Описание краткое
    const fullDescription = this.getFieldValue(fields, 3); // Полное описание
    const dateValue = this.getFieldValue(fields, 4); // Дата начала
    const startTimeValue = this.getFieldValue(fields, 5); // Время начала
    const durationMinutes = this.getFieldValue(fields, 28); // Длительность в минутах
    const roomValue = this.getFieldValue(fields, 6); // Аудитория (catalog)
    const maxCapacityValue = this.getFieldValue(fields, 26); // Ёмкость мероприятия
    const timepadLink = this.getFieldValue(fields, 23); // Ссылка на таймпад
    const isPaidValue = this.getFieldValue(fields, 24); // Платное мероприятие (flag)
    const isGovernmentTaskValue = this.getFieldValue(fields, 15); // Государственное задание (flag)
    const responsiblePerson = this.getFieldValue(fields, 11); // Ответственный (person)
    const eventFormat = this.getFieldValue(fields, 36); // Формат мероприятия (catalog)

    // Парсинг даты
    const dateObj = dateValue ? new Date(dateValue) : new Date();
    const date = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD

    // Логирование для отладки времени
    this.logger.log(`=== Отладка времени для задачи ${task.id} ===`);
    this.logger.log(`Поле 5 (время начала) RAW: ${JSON.stringify(startTimeValue)}`);
    this.logger.log(`Поле 28 (длительность) RAW: ${JSON.stringify(durationMinutes)}`);

    // Парсинг времени начала
    const startTime = this.parseTime(startTimeValue) || '09:00:00';
    this.logger.log(`Время после парсинга: ${startTime}`);

    // Расчет времени окончания на основе длительности
    let endTime: string;
    if (durationMinutes && startTimeValue) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + parseInt(durationMinutes.toString());
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;
      endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`;
      this.logger.log(`Расчет: ${hours}:${minutes} + ${durationMinutes} мин = ${endTime}`);
    } else {
      // Если длительность не указана, используем значение по умолчанию (1 час)
      const [hours, minutes] = startTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + 60; // +1 час по умолчанию
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;
      endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`;
      this.logger.log(`Расчет (по умолчанию +1 час): ${startTime} -> ${endTime}`);
    }
    this.logger.log(`=== Итого: дата=${date}, время=${startTime}-${endTime} ===`);

    // Обработка помещения (catalog поле)
    let roomId: string | null = null;

    // Пытаемся извлечь название аудитории из catalog поля
    if (roomValue && typeof roomValue === 'object' && roomValue.values) {
      const roomName = roomValue.values[0]; // Первое значение из catalog
      if (roomName) {
        // Ищем помещение в БД по названию
        const room = await this.prisma.room.findFirst({
          where: {
            name: {
              contains: roomName,
              mode: 'insensitive',
            },
          },
        });
        if (room) {
          roomId = room.id;
        }
      }
    }

    // Если помещение не найдено, используем первое доступное
    if (!roomId) {
      const firstRoom = await this.prisma.room.findFirst();
      if (!firstRoom) {
        throw new BadRequestException('В системе нет ни одного помещения. Создайте помещение перед импортом.');
      }
      roomId = firstRoom.id;
    }

    // Парсинг boolean полей (flag в Pyrus)
    const isPaid = this.parseBooleanField(isPaidValue);
    const isGovernmentTask = this.parseBooleanField(isGovernmentTaskValue);

    return {
      name,
      description: description || null,
      fullDescription: fullDescription || null,
      date,
      startTime,
      endTime,
      roomId,
      maxCapacity: maxCapacityValue ? parseInt(maxCapacityValue.toString()) : null,
      timepadLink: timepadLink || null,
      isPaid,
      isGovernmentTask,
      eventFormat: eventFormat || null,
      participants: null, // Можно извлечь из отчётности если нужно
      budget: null, // Нет этого поля в форме Pyrus
      notes: null,
      responsibleUserId: null, // TODO: маппинг пользователя из поля 11 (responsiblePerson)
      externalId: task.id.toString(),
      status: 'PLANNED',
    };
  }

  /**
   * Импорт событий из Pyrus
   */
  async importEvents(dto: ImportEventsDto): Promise<ImportResultDto> {
    const result: ImportResultDto = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Получаем задачи из Pyrus
    let tasks: PyrusTask[];

    if (dto.taskIds && dto.taskIds.length > 0) {
      // Получаем все задачи и фильтруем по ID
      const allTasks = await this.getFormTasks();
      tasks = allTasks.filter((task) => dto.taskIds.includes(task.id));
    } else {
      // Получаем все активные задачи
      tasks = await this.getFormTasks({ include_archived: 'n' });
    }

    this.logger.log(`Начало импорта ${tasks.length} задач из Pyrus...`);

    for (const task of tasks) {
      try {
        const eventData = await this.mapPyrusTaskToEvent(task);
        const externalId = task.id.toString();

        // Проверяем, существует ли уже событие с таким externalId
        const existingEvent = await this.prisma.event.findUnique({
          where: { externalId },
        });

        if (existingEvent) {
          // Обновляем существующее событие
          await this.eventsService.update(existingEvent.id, eventData);
          result.updated++;
          this.logger.log(`Обновлено событие с externalId=${externalId}`);
        } else {
          // Создаем новое событие
          await this.eventsService.create(eventData);
          result.imported++;
          this.logger.log(`Импортировано новое событие с externalId=${externalId}`);
        }
      } catch (error) {
        this.logger.error(`Ошибка при импорте задачи ${task.id}`, error.message);
        result.errors.push({
          taskId: task.id,
          error: error.message || 'Неизвестная ошибка',
        });
        result.skipped++;
      }
    }

    this.logger.log(
      `Импорт завершен: импортировано=${result.imported}, обновлено=${result.updated}, пропущено=${result.skipped}`,
    );

    return result;
  }

  /**
   * Получить справочник из Pyrus
   */
  async getCatalog(catalogId: string): Promise<PyrusCatalog> {
    const token = await this.getAccessToken();

    this.logger.log(`Получение справочника ${catalogId} из Pyrus...`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<PyrusCatalog>(`${this.API_BASE_URL}/catalogs/${catalogId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      this.logger.log(`Получено ${response.data.items?.length || 0} элементов из справочника ${catalogId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Ошибка при получении справочника из Pyrus', error.response?.data || error.message);
      throw new BadRequestException('Не удалось получить справочник из Pyrus');
    }
  }

  /**
   * Синхронизировать помещения из справочника Pyrus
   */
  async syncRoomsFromCatalog(catalogId: string = '62235'): Promise<{ created: number; updated: number; errors: string[] }> {
    const result = {
      created: 0,
      updated: 0,
      errors: [],
    };

    try {
      const catalog = await this.getCatalog(catalogId);

      for (const item of catalog.items) {
        if (item.deleted) continue; // Пропускаем удаленные элементы

        const roomName = item.values[0]; // Первое значение - название аудитории
        if (!roomName) continue;

        const pyrusId = item.item_id?.toString();

        try {
          // Ищем помещение сначала по pyrusId, затем по названию
          let existingRoom = pyrusId
            ? await this.prisma.room.findUnique({
                where: { pyrusId },
              })
            : null;

          if (!existingRoom) {
            existingRoom = await this.prisma.room.findFirst({
              where: {
                name: {
                  equals: roomName,
                  mode: 'insensitive',
                },
              },
            });
          }

          // Если не найдено по точному совпадению, ищем похожие названия (fuzzy match)
          if (!existingRoom) {
            const allRooms = await this.prisma.room.findMany({
              where: { status: { not: 'RETIRED' } },
            });
            const SIMILARITY_THRESHOLD = 0.75; // Порог схожести (75%)

            for (const candidate of allRooms) {
              const similarity = stringSimilarity(roomName, candidate.name);
              if (similarity >= SIMILARITY_THRESHOLD) {
                this.logger.warn(
                  `⚠️  ПОТЕНЦИАЛЬНЫЙ ДУБЛЬ: Помещение в Pyrus "${roomName}" похоже на существующее в CRM "${candidate.name}" (схожесть: ${(similarity * 100).toFixed(0)}%). ` +
                  `Рекомендуется проверить вручную. Пропускаем создание дубля.`,
                );
                result.errors.push(
                  `Потенциальный дубль: "${roomName}" (Pyrus) похож на "${candidate.name}" (CRM)`,
                );
                existingRoom = null; // Не создаем и не обновляем
                break;
              }
            }
          }

          // Пропускаем, если обнаружен потенциальный дубль
          if (existingRoom === null && result.errors.some(e => e.includes(roomName))) {
            continue;
          }

          if (existingRoom) {
            // Проверяем, отличаются ли данные
            const dataChanged = existingRoom.name !== roomName;

            if (!dataChanged) {
              // Данные не изменились - просто обновляем lastSyncedAt и pyrusId
              await this.prisma.room.update({
                where: { id: existingRoom.id },
                data: {
                  pyrusId: pyrusId,
                  lastSyncedAt: new Date(),
                },
              });
              result.updated++;
              this.logger.log(`Синхронизировано помещение "${roomName}" (без изменений)`);
            } else {
              // Данные изменились - проверяем наличие конфликта
              const hasConflict =
                !existingRoom.lastSyncedAt ||
                (existingRoom.lastSyncedAt && existingRoom.updatedAt > existingRoom.lastSyncedAt);

              if (hasConflict) {
                // КОНФЛИКТ: объект изменен в CRM - НЕ перезаписываем данные из Pyrus
                const conflictMessage =
                  `КОНФЛИКТ: Помещение "${existingRoom.name}" (CRM) vs "${roomName}" (Pyrus) - требуется ручное разрешение`;
                this.logger.warn(`⚠️  ${conflictMessage}`);
                result.errors.push(conflictMessage);
                result.updated++;
              } else {
                // Нет конфликта - обновляем данными из Pyrus
                await this.prisma.room.update({
                  where: { id: existingRoom.id },
                  data: {
                    name: roomName,
                    pyrusId: pyrusId,
                    equipment: existingRoom.equipment
                      ? existingRoom.equipment
                      : `Синхронизировано из Pyrus (ID: ${item.item_id})`,
                    lastSyncedAt: new Date(),
                  },
                });
                result.updated++;
                this.logger.log(`Обновлено помещение "${roomName}" из Pyrus (pyrusId: ${pyrusId})`);
              }
            }
          } else {
            // Создаем новое помещение
            await this.prisma.room.create({
              data: {
                name: roomName,
                type: 'HALL', // По умолчанию тип HALL
                hourlyRate: 0, // Ставка по умолчанию
                capacity: null, // Можно добавить вместимость если есть в справочнике
                equipment: `Синхронизировано из Pyrus (ID: ${item.item_id})`,
                pyrusId: pyrusId,
              },
            });
            result.created++;
            this.logger.log(`Создано помещение "${roomName}" (pyrusId: ${pyrusId})`);
          }
        } catch (error) {
          this.logger.error(`Ошибка при обработке помещения "${roomName}"`, error.message);
          result.errors.push(`${roomName}: ${error.message}`);
        }
      }

      this.logger.log(
        `Синхронизация помещений завершена: создано=${result.created}, обновлено=${result.updated}, ошибок=${result.errors.length}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Ошибка при синхронизации помещений', error.message);
      throw error;
    }
  }

  /**
   * Добавить или обновить элемент в справочнике Pyrus
   */
  private async upsertCatalogItem(
    catalogId: string,
    itemId: number | null,
    values: string[],
    headers?: string[],
  ): Promise<PyrusCatalogItem> {
    const token = await this.getAccessToken();

    try {
      if (itemId) {
        // Обновление существующего элемента
        const response = await firstValueFrom(
          this.httpService.put<PyrusCatalogItem>(
            `${this.API_BASE_URL}/catalogs/${catalogId}/items/${itemId}`,
            { values },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            },
          ),
        );
        this.logger.log(`Обновлен элемент ${itemId} в справочнике ${catalogId}`);
        return response.data;
      } else {
        // Создание нового элемента через API /diff
        // Дополняем values пустыми строками до нужной длины (если передан headers)
        let paddedValues = values;
        if (headers && headers.length > values.length) {
          paddedValues = [...values, ...Array(headers.length - values.length).fill('')];
          this.logger.debug(
            `Дополнены значения для справочника ${catalogId}: ${values.length} -> ${paddedValues.length} (headers: ${headers.length})`,
          );
        }

        const response = await firstValueFrom(
          this.httpService.post<PyrusCatalogDiffResponse>(
            `${this.API_BASE_URL}/catalogs/${catalogId}/diff`,
            {
              upsert: [{ values: paddedValues }],
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            },
          ),
        );

        // Логируем полный ответ для отладки
        this.logger.debug(`Ответ от API /diff для справочника ${catalogId}:`, JSON.stringify(response.data));

        // Извлекаем первый элемент из ответа
        const createdItem = response.data.items?.[0];
        if (!createdItem) {
          this.logger.error(`API /diff не вернул созданный элемент. Структура ответа:`, response.data);
          throw new Error('API /diff не вернул созданный элемент');
        }

        this.logger.log(`Создан новый элемент в справочнике ${catalogId} (ID: ${createdItem.item_id})`);
        return createdItem;
      }
    } catch (error) {
      this.logger.error(
        `Ошибка при ${itemId ? 'обновлении' : 'создании'} элемента в справочнике ${catalogId}`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Синхронизировать помещения в Pyrus (обратная синхронизация Room → Pyrus)
   */
  async syncRoomsToPyrus(catalogId: string = '62235'): Promise<{ created: number; updated: number; errors: string[] }> {
    const result = {
      created: 0,
      updated: 0,
      errors: [],
    };

    try {
      // Получаем все помещения из БД
      const rooms = await this.prisma.room.findMany({
        where: { status: { not: 'RETIRED' } },
      });

      // Получаем текущий справочник из Pyrus
      const catalog = await this.getCatalog(catalogId);
      const catalogItemsMapById = new Map<string, PyrusCatalogItem>();
      const catalogItemsMapByName = new Map<string, PyrusCatalogItem>();

      // Создаем мапы существующих элементов
      for (const item of catalog.items) {
        if (!item.deleted) {
          if (item.item_id) {
            catalogItemsMapById.set(item.item_id.toString(), item);
          }
          if (item.values[0]) {
            catalogItemsMapByName.set(item.values[0].toLowerCase(), item);
          }
        }
      }

      // Синхронизируем каждое помещение
      for (const room of rooms) {
        try {
          // Ищем элемент сначала по pyrusId, затем по названию
          let existingItem = room.pyrusId ? catalogItemsMapById.get(room.pyrusId) : null;
          if (!existingItem) {
            existingItem = catalogItemsMapByName.get(room.name.toLowerCase());
          }

          // Если не найдено по точному совпадению, ищем похожие названия (fuzzy match)
          if (!existingItem) {
            const SIMILARITY_THRESHOLD = 0.75; // Порог схожести (75%)
            let foundSimilar = false;

            for (const [pyrusName, item] of Array.from(catalogItemsMapByName.entries())) {
              const similarity = stringSimilarity(room.name, pyrusName);
              if (similarity >= SIMILARITY_THRESHOLD) {
                this.logger.warn(
                  `⚠️  ПОТЕНЦИАЛЬНЫЙ ДУБЛЬ: Помещение в CRM "${room.name}" похоже на существующее в Pyrus "${pyrusName}" (схожесть: ${(similarity * 100).toFixed(0)}%). ` +
                  `Рекомендуется проверить вручную. Пропускаем создание дубля.`,
                );
                result.errors.push(
                  `Потенциальный дубль: "${room.name}" (CRM) похож на "${pyrusName}" (Pyrus)`,
                );
                foundSimilar = true;
                break;
              }
            }

            if (foundSimilar) {
              continue; // Пропускаем создание дубля
            }
          }

          if (existingItem) {
            // Обновляем существующий элемент если название изменилось
            if (existingItem.values[0] !== room.name) {
              await this.upsertCatalogItem(catalogId, existingItem.item_id, [room.name], catalog.catalog_headers);
              this.logger.log(`Обновлено помещение "${room.name}" в справочнике Pyrus (ID: ${existingItem.item_id})`);
            }

            // Сохраняем pyrusId если его еще нет
            if (!room.pyrusId && existingItem.item_id) {
              await this.prisma.room.update({
                where: { id: room.id },
                data: { pyrusId: existingItem.item_id.toString() },
              });
            }

            result.updated++;
          } else {
            // Создаем новый элемент в справочнике
            const newItem = await this.upsertCatalogItem(catalogId, null, [room.name], catalog.catalog_headers);

            // Сохраняем pyrusId в БД
            if (newItem.item_id) {
              await this.prisma.room.update({
                where: { id: room.id },
                data: { pyrusId: newItem.item_id.toString() },
              });
            }

            result.created++;
            this.logger.log(`Добавлено помещение "${room.name}" в справочник Pyrus (ID: ${newItem.item_id})`);
          }
        } catch (error) {
          this.logger.error(`Ошибка при синхронизации помещения "${room.name}"`, error.message);
          result.errors.push(`${room.name}: ${error.message}`);
        }
      }

      this.logger.log(
        `Синхронизация помещений в Pyrus завершена: создано=${result.created}, обновлено=${result.updated}, ошибок=${result.errors.length}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Ошибка при синхронизации помещений в Pyrus', error.message);
      throw error;
    }
  }

  /**
   * Двусторонняя синхронизация помещений (Pyrus ↔ Room)
   * ВАЖНО: автоматически синхронизирует без проверки конфликтов
   * Используйте previewRoomsSync для предпросмотра конфликтов
   */
  async syncRoomsBidirectional(catalogId: string = '62235'): Promise<{
    fromPyrus: { created: number; updated: number; errors: string[] };
    toPyrus: { created: number; updated: number; errors: string[] };
  }> {
    this.logger.log('Начало двусторонней синхронизации помещений');

    const fromPyrus = await this.syncRoomsFromCatalog(catalogId);
    const toPyrus = await this.syncRoomsToPyrus(catalogId);

    this.logger.log('Двусторонняя синхронизация помещений завершена');

    return {
      fromPyrus,
      toPyrus,
    };
  }

  /**
   * Предпросмотр синхронизации помещений - показывает что будет создано и конфликты
   */
  async previewRoomsSync(catalogId: string = '62235'): Promise<{
    toCreate: {
      inPyrus: string[];
      inCRM: string[];
    };
    conflicts: Array<{
      name: string;
      existsInBoth: boolean;
    }>;
  }> {
    const rooms = await this.prisma.room.findMany({
      where: { status: { not: 'RETIRED' } },
    });

    const catalog = await this.getCatalog(catalogId);
    const pyrusItemsMap = new Map<string, boolean>();
    const crmItemsMap = new Map<string, boolean>();

    // Создаем мапы для быстрого поиска
    for (const item of catalog.items) {
      if (!item.deleted && item.values[0]) {
        pyrusItemsMap.set(item.values[0].toLowerCase(), true);
      }
    }

    for (const room of rooms) {
      crmItemsMap.set(room.name.toLowerCase(), true);
    }

    // Находим что нужно создать и конфликты
    const toCreateInPyrus: string[] = [];
    const toCreateInCRM: string[] = [];
    const conflicts: Array<{ name: string; existsInBoth: boolean }> = [];

    // Проверяем помещения из CRM
    for (const room of rooms) {
      if (pyrusItemsMap.has(room.name.toLowerCase())) {
        conflicts.push({ name: room.name, existsInBoth: true });
      } else {
        toCreateInPyrus.push(room.name);
      }
    }

    // Проверяем элементы из Pyrus
    for (const item of catalog.items) {
      if (!item.deleted && item.values[0]) {
        const name = item.values[0];
        if (!crmItemsMap.has(name.toLowerCase())) {
          toCreateInCRM.push(name);
        }
      }
    }

    return {
      toCreate: {
        inPyrus: toCreateInPyrus,
        inCRM: toCreateInCRM,
      },
      conflicts,
    };
  }

  /**
   * Синхронизировать типы мероприятий из справочника Pyrus (Pyrus → EventType)
   */
  async syncEventTypesFromCatalog(catalogId: string = '134275'): Promise<{ created: number; updated: number; errors: string[] }> {
    const result = {
      created: 0,
      updated: 0,
      errors: [],
    };

    try {
      const catalog = await this.getCatalog(catalogId);

      for (const item of catalog.items) {
        if (item.deleted) continue;

        const eventTypeName = item.values[0];
        if (!eventTypeName) continue;

        const pyrusId = item.item_id?.toString();

        try {
          // Ищем тип мероприятия сначала по pyrusId, затем по названию
          let existingEventType = pyrusId
            ? await this.prisma.eventType.findUnique({
                where: { pyrusId },
              })
            : null;

          if (!existingEventType) {
            existingEventType = await this.prisma.eventType.findFirst({
              where: {
                name: {
                  equals: eventTypeName,
                  mode: 'insensitive',
                },
              },
            });
          }

          // Если не найдено по точному совпадению, ищем похожие названия (fuzzy match)
          if (!existingEventType) {
            const allEventTypes = await this.prisma.eventType.findMany();
            const SIMILARITY_THRESHOLD = 0.75; // Порог схожести (75%)

            for (const candidate of allEventTypes) {
              const similarity = stringSimilarity(eventTypeName, candidate.name);
              if (similarity >= SIMILARITY_THRESHOLD) {
                this.logger.warn(
                  `⚠️  ПОТЕНЦИАЛЬНЫЙ ДУБЛЬ: Тип мероприятия в Pyrus "${eventTypeName}" похож на существующий в CRM "${candidate.name}" (схожесть: ${(similarity * 100).toFixed(0)}%). ` +
                  `Рекомендуется проверить вручную. Пропускаем создание дубля.`,
                );
                result.errors.push(
                  `Потенциальный дубль: "${eventTypeName}" (Pyrus) похож на "${candidate.name}" (CRM)`,
                );
                existingEventType = null; // Не создаем и не обновляем
                break;
              }
            }
          }

          // Пропускаем, если обнаружен потенциальный дубль
          if (existingEventType === null && result.errors.some(e => e.includes(eventTypeName))) {
            continue;
          }

          if (existingEventType) {
            // Проверяем, отличаются ли данные
            const dataChanged = existingEventType.name !== eventTypeName;

            if (!dataChanged) {
              // Данные не изменились - просто обновляем lastSyncedAt и pyrusId
              await this.prisma.eventType.update({
                where: { id: existingEventType.id },
                data: {
                  pyrusId: pyrusId,
                  lastSyncedAt: new Date(),
                },
              });
              result.updated++;
              this.logger.log(`Синхронизирован тип мероприятия "${eventTypeName}" (без изменений)`);
            } else {
              // Данные изменились - проверяем наличие конфликта
              const hasConflict =
                !existingEventType.lastSyncedAt ||
                (existingEventType.lastSyncedAt && existingEventType.updatedAt > existingEventType.lastSyncedAt);

              if (hasConflict) {
                // КОНФЛИКТ: объект изменен в CRM - НЕ перезаписываем данные из Pyrus
                const conflictMessage =
                  `КОНФЛИКТ: Тип мероприятия "${existingEventType.name}" (CRM) vs "${eventTypeName}" (Pyrus) - требуется ручное разрешение`;
                this.logger.warn(`⚠️  ${conflictMessage}`);
                result.errors.push(conflictMessage);
                result.updated++;
              } else {
                // Нет конфликта - обновляем данными из Pyrus
                await this.prisma.eventType.update({
                  where: { id: existingEventType.id },
                  data: {
                    name: eventTypeName,
                    pyrusId: pyrusId,
                    lastSyncedAt: new Date(),
                  },
                });
                result.updated++;
                this.logger.log(`Обновлен тип мероприятия "${eventTypeName}" из Pyrus (pyrusId: ${pyrusId})`);
              }
            }
          } else {
            // Создаем новый тип мероприятия
            await this.prisma.eventType.create({
              data: {
                name: eventTypeName,
                pyrusId: pyrusId,
              },
            });
            result.created++;
            this.logger.log(`Создан тип мероприятия "${eventTypeName}" (pyrusId: ${pyrusId})`);
          }
        } catch (error) {
          this.logger.error(`Ошибка при обработке типа мероприятия "${eventTypeName}"`, error.message);
          result.errors.push(`${eventTypeName}: ${error.message}`);
        }
      }

      this.logger.log(
        `Синхронизация типов мероприятий завершена: создано=${result.created}, обновлено=${result.updated}, ошибок=${result.errors.length}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Ошибка при синхронизации типов мероприятий', error.message);
      throw error;
    }
  }

  /**
   * Синхронизировать типы мероприятий в Pyrus (EventType → Pyrus)
   */
  async syncEventTypesToPyrus(catalogId: string = '134275'): Promise<{ created: number; updated: number; errors: string[] }> {
    const result = {
      created: 0,
      updated: 0,
      errors: [],
    };

    try {
      const eventTypes = await this.prisma.eventType.findMany();
      const catalog = await this.getCatalog(catalogId);
      const catalogItemsMapById = new Map<string, PyrusCatalogItem>();
      const catalogItemsMapByName = new Map<string, PyrusCatalogItem>();

      // Создаем мапы существующих элементов
      for (const item of catalog.items) {
        if (!item.deleted) {
          if (item.item_id) {
            catalogItemsMapById.set(item.item_id.toString(), item);
          }
          if (item.values[0]) {
            catalogItemsMapByName.set(item.values[0].toLowerCase(), item);
          }
        }
      }

      for (const eventType of eventTypes) {
        try {
          // Ищем элемент сначала по pyrusId, затем по названию
          let existingItem = eventType.pyrusId ? catalogItemsMapById.get(eventType.pyrusId) : null;
          if (!existingItem) {
            existingItem = catalogItemsMapByName.get(eventType.name.toLowerCase());
          }

          // Если не найдено по точному совпадению, ищем похожие названия (fuzzy match)
          if (!existingItem) {
            const SIMILARITY_THRESHOLD = 0.75; // Порог схожести (75%)
            let foundSimilar = false;

            for (const [pyrusName, item] of Array.from(catalogItemsMapByName.entries())) {
              const similarity = stringSimilarity(eventType.name, pyrusName);
              if (similarity >= SIMILARITY_THRESHOLD) {
                this.logger.warn(
                  `⚠️  ПОТЕНЦИАЛЬНЫЙ ДУБЛЬ: Тип мероприятия в CRM "${eventType.name}" похож на существующий в Pyrus "${pyrusName}" (схожесть: ${(similarity * 100).toFixed(0)}%). ` +
                  `Рекомендуется проверить вручную. Пропускаем создание дубля.`,
                );
                result.errors.push(
                  `Потенциальный дубль: "${eventType.name}" (CRM) похож на "${pyrusName}" (Pyrus)`,
                );
                foundSimilar = true;
                break;
              }
            }

            if (foundSimilar) {
              continue; // Пропускаем создание дубля
            }
          }

          if (existingItem) {
            // Обновляем существующий элемент если название изменилось
            if (existingItem.values[0] !== eventType.name) {
              await this.upsertCatalogItem(catalogId, existingItem.item_id, [eventType.name], catalog.catalog_headers);
              this.logger.log(`Обновлен тип мероприятия "${eventType.name}" в справочнике Pyrus (ID: ${existingItem.item_id})`);
            }

            // Сохраняем pyrusId если его еще нет
            if (!eventType.pyrusId && existingItem.item_id) {
              await this.prisma.eventType.update({
                where: { id: eventType.id },
                data: { pyrusId: existingItem.item_id.toString() },
              });
            }

            result.updated++;
          } else {
            // Создаем новый элемент в справочнике
            const newItem = await this.upsertCatalogItem(catalogId, null, [eventType.name], catalog.catalog_headers);

            // Сохраняем pyrusId в БД
            if (newItem.item_id) {
              await this.prisma.eventType.update({
                where: { id: eventType.id },
                data: { pyrusId: newItem.item_id.toString() },
              });
            }

            result.created++;
            this.logger.log(`Добавлен тип мероприятия "${eventType.name}" в справочник Pyrus (ID: ${newItem.item_id})`);
          }
        } catch (error) {
          this.logger.error(`Ошибка при синхронизации типа мероприятия "${eventType.name}"`, error.message);
          result.errors.push(`${eventType.name}: ${error.message}`);
        }
      }

      this.logger.log(
        `Синхронизация типов мероприятий в Pyrus завершена: создано=${result.created}, обновлено=${result.updated}, ошибок=${result.errors.length}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Ошибка при синхронизации типов мероприятий в Pyrus', error.message);
      throw error;
    }
  }

  /**
   * Двусторонняя синхронизация типов мероприятий (Pyrus ↔ EventType)
   * ВАЖНО: автоматически синхронизирует без проверки конфликтов
   * Используйте previewEventTypesSync для предпросмотра конфликтов
   */
  async syncEventTypesBidirectional(catalogId: string = '134275'): Promise<{
    fromPyrus: { created: number; updated: number; errors: string[] };
    toPyrus: { created: number; updated: number; errors: string[] };
  }> {
    this.logger.log('Начало двусторонней синхронизации типов мероприятий');

    const fromPyrus = await this.syncEventTypesFromCatalog(catalogId);
    const toPyrus = await this.syncEventTypesToPyrus(catalogId);

    this.logger.log('Двусторонняя синхронизация типов мероприятий завершена');

    return {
      fromPyrus,
      toPyrus,
    };
  }

  /**
   * Предпросмотр синхронизации типов мероприятий - показывает что будет создано и конфликты
   */
  async previewEventTypesSync(catalogId: string = '134275'): Promise<{
    toCreate: {
      inPyrus: string[];
      inCRM: string[];
    };
    conflicts: Array<{
      name: string;
      existsInBoth: boolean;
    }>;
  }> {
    const eventTypes = await this.prisma.eventType.findMany();
    const catalog = await this.getCatalog(catalogId);

    const pyrusItemsMap = new Map<string, boolean>();
    const crmItemsMap = new Map<string, boolean>();

    // Создаем мапы для быстрого поиска
    for (const item of catalog.items) {
      if (!item.deleted && item.values[0]) {
        pyrusItemsMap.set(item.values[0].toLowerCase(), true);
      }
    }

    for (const eventType of eventTypes) {
      crmItemsMap.set(eventType.name.toLowerCase(), true);
    }

    // Находим что нужно создать и конфликты
    const toCreateInPyrus: string[] = [];
    const toCreateInCRM: string[] = [];
    const conflicts: Array<{ name: string; existsInBoth: boolean }> = [];

    // Проверяем типы из CRM
    for (const eventType of eventTypes) {
      if (pyrusItemsMap.has(eventType.name.toLowerCase())) {
        conflicts.push({ name: eventType.name, existsInBoth: true });
      } else {
        toCreateInPyrus.push(eventType.name);
      }
    }

    // Проверяем элементы из Pyrus
    for (const item of catalog.items) {
      if (!item.deleted && item.values[0]) {
        const name = item.values[0];
        if (!crmItemsMap.has(name.toLowerCase())) {
          toCreateInCRM.push(name);
        }
      }
    }

    return {
      toCreate: {
        inPyrus: toCreateInPyrus,
        inCRM: toCreateInCRM,
      },
      conflicts,
    };
  }

  /**
   * Обнаружить конфликты при синхронизации
   * Конфликт = объект существует в обеих системах и был изменен в CRM после последней синхронизации
   */
  async detectSyncConflicts(): Promise<SyncConflictsResponseDto> {
    const eventTypeConflicts: EventTypeConflictDto[] = [];
    const roomConflicts: RoomConflictDto[] = [];

    // Проверяем конфликты типов мероприятий
    const eventTypes = await this.prisma.eventType.findMany({
      where: { pyrusId: { not: null } },
    });

    const eventTypesCatalog = await this.getCatalog('134275');
    const eventTypesPyrusMap = new Map<string, PyrusCatalogItem>();
    for (const item of eventTypesCatalog.items) {
      if (!item.deleted && item.item_id) {
        eventTypesPyrusMap.set(item.item_id.toString(), item);
      }
    }

    for (const eventType of eventTypes) {
      if (!eventType.pyrusId) continue;

      const pyrusItem = eventTypesPyrusMap.get(eventType.pyrusId);
      if (!pyrusItem) continue;

      // Проверяем, отличаются ли данные
      const dataChanged = eventType.name !== pyrusItem.values[0];

      if (!dataChanged) {
        // Данные одинаковые - конфликта нет
        continue;
      }

      // Конфликт есть если:
      // 1. lastSyncedAt == null (никогда не синхронизировался) И данные отличаются
      // 2. ИЛИ объект изменен в CRM после последней синхронизации (updatedAt > lastSyncedAt)
      const isConflict =
        !eventType.lastSyncedAt ||
        (eventType.lastSyncedAt && eventType.updatedAt > eventType.lastSyncedAt);

      if (isConflict) {
        eventTypeConflicts.push({
          id: eventType.id,
          pyrusId: eventType.pyrusId,
          crmData: {
            name: eventType.name,
            description: eventType.description || undefined,
            color: eventType.color || undefined,
            updatedAt: eventType.updatedAt,
          },
          pyrusData: {
            name: pyrusItem.values[0],
          },
          lastSyncedAt: eventType.lastSyncedAt || undefined,
        });
      }
    }

    // Проверяем конфликты помещений
    const rooms = await this.prisma.room.findMany({
      where: { pyrusId: { not: null } },
    });

    const roomsCatalog = await this.getCatalog('62235');
    const roomsPyrusMap = new Map<string, PyrusCatalogItem>();
    for (const item of roomsCatalog.items) {
      if (!item.deleted && item.item_id) {
        roomsPyrusMap.set(item.item_id.toString(), item);
      }
    }

    for (const room of rooms) {
      if (!room.pyrusId) continue;

      const pyrusItem = roomsPyrusMap.get(room.pyrusId);
      if (!pyrusItem) continue;

      // Проверяем, отличаются ли данные
      const dataChanged = room.name !== pyrusItem.values[0];

      if (!dataChanged) {
        // Данные одинаковые - конфликта нет
        continue;
      }

      // Конфликт есть если:
      // 1. lastSyncedAt == null (никогда не синхронизировался) И данные отличаются
      // 2. ИЛИ объект изменен в CRM после последней синхронизации (updatedAt > lastSyncedAt)
      const isConflict =
        !room.lastSyncedAt ||
        (room.lastSyncedAt && room.updatedAt > room.lastSyncedAt);

      if (isConflict) {
        roomConflicts.push({
          id: room.id,
          pyrusId: room.pyrusId,
          crmData: {
            name: room.name,
            updatedAt: room.updatedAt,
          },
          pyrusData: {
            name: pyrusItem.values[0],
          },
          lastSyncedAt: room.lastSyncedAt || undefined,
        });
      }
    }

    return {
      eventTypeConflicts,
      roomConflicts,
      hasConflicts: eventTypeConflicts.length > 0 || roomConflicts.length > 0,
    };
  }

  /**
   * Синхронизация с разрешением конфликтов
   */
  async syncWithConflictResolution(dto: SyncWithResolutionDto): Promise<{
    eventTypes: { created: number; updated: number; skipped: number; errors: string[] };
    rooms: { created: number; updated: number; skipped: number; errors: string[] };
  }> {
    const result = {
      eventTypes: { created: 0, updated: 0, skipped: 0, errors: [] as string[] },
      rooms: { created: 0, updated: 0, skipped: 0, errors: [] as string[] },
    };

    // Создаем мапы разрешений для быстрого поиска
    const eventTypeResolutionsMap = new Map<string, ConflictResolution>();
    const roomResolutionsMap = new Map<string, ConflictResolution>();

    if (dto.eventTypeResolutions) {
      for (const res of dto.eventTypeResolutions) {
        eventTypeResolutionsMap.set(res.id, res.resolution);
      }
    }

    if (dto.roomResolutions) {
      for (const res of dto.roomResolutions) {
        roomResolutionsMap.set(res.id, res.resolution);
      }
    }

    // Синхронизация типов мероприятий
    const eventTypes = await this.prisma.eventType.findMany();
    const eventTypesCatalog = await this.getCatalog('134275');
    const eventTypesPyrusMapById = new Map<string, PyrusCatalogItem>();
    const eventTypesPyrusMapByName = new Map<string, PyrusCatalogItem>();

    for (const item of eventTypesCatalog.items) {
      if (!item.deleted) {
        if (item.item_id) {
          eventTypesPyrusMapById.set(item.item_id.toString(), item);
        }
        if (item.values[0]) {
          eventTypesPyrusMapByName.set(item.values[0].toLowerCase(), item);
        }
      }
    }

    for (const eventType of eventTypes) {
      try {
        const resolution = eventTypeResolutionsMap.get(eventType.id);
        let pyrusItem = eventType.pyrusId ? eventTypesPyrusMapById.get(eventType.pyrusId) : null;
        if (!pyrusItem) {
          pyrusItem = eventTypesPyrusMapByName.get(eventType.name.toLowerCase());
        }

        if (resolution === ConflictResolution.SKIP) {
          result.eventTypes.skipped++;
          continue;
        }

        if (resolution === ConflictResolution.USE_CRM) {
          // Обновляем Pyrus данными из CRM
          if (pyrusItem) {
            if (pyrusItem.values[0] !== eventType.name) {
              await this.upsertCatalogItem('134275', pyrusItem.item_id, [eventType.name], eventTypesCatalog.catalog_headers);
            }
            if (!eventType.pyrusId && pyrusItem.item_id) {
              await this.prisma.eventType.update({
                where: { id: eventType.id },
                data: { pyrusId: pyrusItem.item_id.toString(), lastSyncedAt: new Date() },
              });
            } else {
              await this.prisma.eventType.update({
                where: { id: eventType.id },
                data: { lastSyncedAt: new Date() },
              });
            }
          } else {
            const newItem = await this.upsertCatalogItem('134275', null, [eventType.name], eventTypesCatalog.catalog_headers);
            if (newItem.item_id) {
              await this.prisma.eventType.update({
                where: { id: eventType.id },
                data: { pyrusId: newItem.item_id.toString(), lastSyncedAt: new Date() },
              });
            }
          }
          result.eventTypes.updated++;
        } else if (resolution === ConflictResolution.USE_PYRUS) {
          // Обновляем CRM данными из Pyrus
          if (pyrusItem) {
            await this.prisma.eventType.update({
              where: { id: eventType.id },
              data: {
                name: pyrusItem.values[0],
                pyrusId: pyrusItem.item_id?.toString(),
                lastSyncedAt: new Date(),
              },
            });
            result.eventTypes.updated++;
          }
        } else {
          // Нет конфликта - обычная синхронизация
          // Сначала отправляем изменения из CRM в Pyrus
          if (pyrusItem) {
            if (pyrusItem.values[0] !== eventType.name) {
              await this.upsertCatalogItem('134275', pyrusItem.item_id, [eventType.name], eventTypesCatalog.catalog_headers);
              result.eventTypes.updated++;
            }
            if (!eventType.pyrusId && pyrusItem.item_id) {
              await this.prisma.eventType.update({
                where: { id: eventType.id },
                data: { pyrusId: pyrusItem.item_id.toString(), lastSyncedAt: new Date() },
              });
            }
          } else {
            const newItem = await this.upsertCatalogItem('134275', null, [eventType.name], eventTypesCatalog.catalog_headers);
            if (newItem.item_id) {
              await this.prisma.eventType.update({
                where: { id: eventType.id },
                data: { pyrusId: newItem.item_id.toString(), lastSyncedAt: new Date() },
              });
            }
            result.eventTypes.created++;
          }
        }
      } catch (error) {
        this.logger.error(`Ошибка при синхронизации типа мероприятия "${eventType.name}"`, error.message);
        result.eventTypes.errors.push(`${eventType.name}: ${error.message}`);
      }
    }

    // Синхронизация из Pyrus в CRM (только новые объекты)
    for (const item of eventTypesCatalog.items) {
      if (item.deleted || !item.values[0]) continue;

      const pyrusId = item.item_id?.toString();
      let existingEventType = pyrusId
        ? await this.prisma.eventType.findUnique({ where: { pyrusId } })
        : null;

      if (!existingEventType) {
        existingEventType = await this.prisma.eventType.findFirst({
          where: { name: { equals: item.values[0], mode: 'insensitive' } },
        });
      }

      if (!existingEventType) {
        // Создаем новый объект в CRM
        try {
          await this.prisma.eventType.create({
            data: {
              name: item.values[0],
              pyrusId: pyrusId,
              lastSyncedAt: new Date(),
            },
          });
          result.eventTypes.created++;
        } catch (error) {
          this.logger.error(`Ошибка при создании типа мероприятия "${item.values[0]}"`, error.message);
          result.eventTypes.errors.push(`${item.values[0]}: ${error.message}`);
        }
      }
    }

    // Аналогично для помещений
    const rooms = await this.prisma.room.findMany({ where: { status: { not: 'RETIRED' } } });
    const roomsCatalog = await this.getCatalog('62235');
    const roomsPyrusMapById = new Map<string, PyrusCatalogItem>();
    const roomsPyrusMapByName = new Map<string, PyrusCatalogItem>();

    for (const item of roomsCatalog.items) {
      if (!item.deleted) {
        if (item.item_id) {
          roomsPyrusMapById.set(item.item_id.toString(), item);
        }
        if (item.values[0]) {
          roomsPyrusMapByName.set(item.values[0].toLowerCase(), item);
        }
      }
    }

    for (const room of rooms) {
      try {
        const resolution = roomResolutionsMap.get(room.id);
        let pyrusItem = room.pyrusId ? roomsPyrusMapById.get(room.pyrusId) : null;
        if (!pyrusItem) {
          pyrusItem = roomsPyrusMapByName.get(room.name.toLowerCase());
        }

        if (resolution === ConflictResolution.SKIP) {
          result.rooms.skipped++;
          continue;
        }

        if (resolution === ConflictResolution.USE_CRM) {
          // Обновляем Pyrus данными из CRM
          if (pyrusItem) {
            if (pyrusItem.values[0] !== room.name) {
              await this.upsertCatalogItem('62235', pyrusItem.item_id, [room.name], roomsCatalog.catalog_headers);
            }
            if (!room.pyrusId && pyrusItem.item_id) {
              // Проверяем, не используется ли уже этот pyrusId
              const existingRoom = await this.prisma.room.findUnique({
                where: { pyrusId: pyrusItem.item_id.toString() },
              });

              if (!existingRoom) {
                await this.prisma.room.update({
                  where: { id: room.id },
                  data: { pyrusId: pyrusItem.item_id.toString(), lastSyncedAt: new Date() },
                });
              } else {
                this.logger.warn(
                  `Пропущено помещение "${room.name}" - pyrusId ${pyrusItem.item_id} уже используется помещением "${existingRoom.name}"`,
                );
                await this.prisma.room.update({
                  where: { id: room.id },
                  data: { lastSyncedAt: new Date() },
                });
              }
            } else {
              await this.prisma.room.update({
                where: { id: room.id },
                data: { lastSyncedAt: new Date() },
              });
            }
          } else {
            const newItem = await this.upsertCatalogItem('62235', null, [room.name], roomsCatalog.catalog_headers);
            if (newItem.item_id) {
              await this.prisma.room.update({
                where: { id: room.id },
                data: { pyrusId: newItem.item_id.toString(), lastSyncedAt: new Date() },
              });
            }
          }
          result.rooms.updated++;
        } else if (resolution === ConflictResolution.USE_PYRUS) {
          // Обновляем CRM данными из Pyrus
          if (pyrusItem) {
            await this.prisma.room.update({
              where: { id: room.id },
              data: {
                name: pyrusItem.values[0],
                pyrusId: pyrusItem.item_id?.toString(),
                lastSyncedAt: new Date(),
              },
            });
            result.rooms.updated++;
          }
        } else {
          // Нет конфликта - обычная синхронизация
          if (pyrusItem) {
            if (pyrusItem.values[0] !== room.name) {
              await this.upsertCatalogItem('62235', pyrusItem.item_id, [room.name], roomsCatalog.catalog_headers);
              result.rooms.updated++;
            }
            if (!room.pyrusId && pyrusItem.item_id) {
              // Проверяем, не используется ли уже этот pyrusId
              const existingRoom = await this.prisma.room.findUnique({
                where: { pyrusId: pyrusItem.item_id.toString() },
              });

              if (!existingRoom) {
                await this.prisma.room.update({
                  where: { id: room.id },
                  data: { pyrusId: pyrusItem.item_id.toString(), lastSyncedAt: new Date() },
                });
              } else {
                this.logger.warn(
                  `Пропущено помещение "${room.name}" - pyrusId ${pyrusItem.item_id} уже используется помещением "${existingRoom.name}"`,
                );
              }
            }
          } else {
            const newItem = await this.upsertCatalogItem('62235', null, [room.name], roomsCatalog.catalog_headers);
            if (newItem.item_id) {
              await this.prisma.room.update({
                where: { id: room.id },
                data: { pyrusId: newItem.item_id.toString(), lastSyncedAt: new Date() },
              });
            }
            result.rooms.created++;
          }
        }
      } catch (error) {
        this.logger.error(`Ошибка при синхронизации помещения "${room.name}"`, error.message);
        result.rooms.errors.push(`${room.name}: ${error.message}`);
      }
    }

    // Синхронизация из Pyrus в CRM (только новые помещения)
    for (const item of roomsCatalog.items) {
      if (item.deleted || !item.values[0]) continue;

      const pyrusId = item.item_id?.toString();
      let existingRoom = pyrusId ? await this.prisma.room.findUnique({ where: { pyrusId } }) : null;

      if (!existingRoom) {
        existingRoom = await this.prisma.room.findFirst({
          where: { name: { equals: item.values[0], mode: 'insensitive' } },
        });
      }

      if (!existingRoom) {
        // Создаем новое помещение в CRM
        try {
          await this.prisma.room.create({
            data: {
              name: item.values[0],
              type: 'HALL',
              hourlyRate: 0,
              pyrusId: pyrusId,
              lastSyncedAt: new Date(),
            },
          });
          result.rooms.created++;
        } catch (error) {
          this.logger.error(`Ошибка при создании помещения "${item.values[0]}"`, error.message);
          result.rooms.errors.push(`${item.values[0]}: ${error.message}`);
        }
      }
    }

    this.logger.log(
      `Синхронизация с разрешением конфликтов завершена: ` +
        `EventTypes (создано=${result.eventTypes.created}, обновлено=${result.eventTypes.updated}, пропущено=${result.eventTypes.skipped}), ` +
        `Rooms (создано=${result.rooms.created}, обновлено=${result.rooms.updated}, пропущено=${result.rooms.skipped})`,
    );

    return result;
  }
}
