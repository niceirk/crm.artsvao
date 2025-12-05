import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CallStatus } from '@prisma/client';

interface NovofonJsonRpcResponse<T = unknown> {
  jsonrpc: string;
  id: number;
  result?: {
    data: T;
    metadata?: {
      total_items?: number;
      limits?: {
        day_limit: number;
        day_remaining: number;
        minute_limit: number;
        minute_remaining: number;
      };
    };
  };
  error?: {
    code: number;
    message: string;
    data?: {
      mnemonic: string;
      field?: string;
      value?: string;
    };
  };
}

export interface NovofonEmployee {
  id: number;
  full_name: string;
  login: string;
  extension: {
    extension_phone_number: string;
  };
  phone_numbers: Array<{
    phone_number: string;
    status: string;
  }>;
}

export interface NovofonVirtualNumber {
  id: number;
  virtual_phone_number: string;
  status: string;
  name?: string;
}

interface NovofonCallResult {
  call_session_id: number;
}

export interface NovofonAccount {
  name: string;
  app_id: number;
  timezone: string;
}

@Injectable()
export class NovofonService {
  private readonly logger = new Logger(NovofonService.name);

  // Novofon API 2.0 endpoints
  private readonly DATA_API_URL = 'https://dataapi-jsonrpc.novofon.ru/v2.0';
  private readonly CALL_API_URL = 'https://callapi-jsonrpc.novofon.ru/v4.0';

  // Timeout для API запросов (15 секунд)
  private readonly API_TIMEOUT_MS = 15000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Выполнить JSON-RPC запрос к Novofon API 2.0
   * Включает timeout через AbortController для предотвращения зависания
   */
  private async jsonRpcRequest<T>(
    url: string,
    method: string,
    params: Record<string, unknown>,
    accessToken: string,
  ): Promise<T> {
    const body = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params: {
        access_token: accessToken,
        ...params,
      },
    };

    this.logger.debug(`Novofon API request: ${method}`);

    // Создаём AbortController для timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data: NovofonJsonRpcResponse<T> = await response.json();

      if (data.error) {
        this.logger.error(`Novofon API error: ${data.error.message} (${data.error.data?.mnemonic})`);
        throw new HttpException(
          data.error.message || 'Ошибка Novofon API',
          HttpStatus.BAD_REQUEST,
        );
      }

      return data.result?.data as T;
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.error(`Novofon API timeout after ${this.API_TIMEOUT_MS}ms for method: ${method}`);
        throw new HttpException(
          `Превышено время ожидания ответа от телефонии (${this.API_TIMEOUT_MS / 1000} сек)`,
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Получение настроек телефонии
   */
  async getSettings() {
    let settings = await this.prisma.telephonySettings.findUnique({
      where: { id: 'telephony' },
    });

    if (!settings) {
      // Создаем дефолтные настройки
      settings = await this.prisma.telephonySettings.create({
        data: {
          id: 'telephony',
          provider: 'novofon',
          accessToken: '',
          virtualPhoneNumber: '',
          defaultEmployeeId: null,
          isEnabled: false,
        },
      });
    }

    return settings;
  }

  /**
   * Обновление настроек телефонии
   */
  async updateSettings(dto: UpdateSettingsDto) {
    return this.prisma.telephonySettings.upsert({
      where: { id: 'telephony' },
      update: dto,
      create: {
        id: 'telephony',
        provider: 'novofon',
        accessToken: dto.accessToken || '',
        virtualPhoneNumber: dto.virtualPhoneNumber || '',
        defaultEmployeeId: dto.defaultEmployeeId || null,
        isEnabled: dto.isEnabled ?? false,
      },
    });
  }

  /**
   * Получить список сотрудников из Novofon
   */
  async getEmployees(): Promise<NovofonEmployee[]> {
    const settings = await this.getSettings();

    if (!settings.accessToken) {
      throw new HttpException('API токен не настроен', HttpStatus.BAD_REQUEST);
    }

    return this.jsonRpcRequest<NovofonEmployee[]>(
      this.DATA_API_URL,
      'get.employees',
      {},
      settings.accessToken,
    );
  }

  /**
   * Получить виртуальные номера из Novofon
   */
  async getVirtualNumbers(): Promise<NovofonVirtualNumber[]> {
    const settings = await this.getSettings();

    if (!settings.accessToken) {
      throw new HttpException('API токен не настроен', HttpStatus.BAD_REQUEST);
    }

    return this.jsonRpcRequest<NovofonVirtualNumber[]>(
      this.DATA_API_URL,
      'get.virtual_numbers',
      {},
      settings.accessToken,
    );
  }

  /**
   * Инициировать исходящий звонок (Click-to-Call)
   */
  async initiateCall(userId: string, dto: InitiateCallDto) {
    const settings = await this.getSettings();

    if (!settings.isEnabled) {
      throw new HttpException('Телефония отключена', HttpStatus.SERVICE_UNAVAILABLE);
    }

    if (!settings.accessToken || !settings.virtualPhoneNumber) {
      throw new HttpException('Телефония не настроена', HttpStatus.BAD_REQUEST);
    }

    // Нормализуем номер телефона (убираем все кроме цифр и +)
    let toNumber = dto.toNumber.replace(/[^0-9+]/g, '');
    // Если номер начинается с 8, заменяем на 7
    if (toNumber.startsWith('8') && toNumber.length === 11) {
      toNumber = '7' + toNumber.substring(1);
    }
    // Убираем + для API
    toNumber = toNumber.replace('+', '');

    // Определяем ID сотрудника
    const employeeId = dto.employeeId || settings.defaultEmployeeId;
    if (!employeeId) {
      throw new HttpException(
        'Не указан сотрудник для звонка. Настройте сотрудника по умолчанию.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Создаем запись в истории звонков
    const callLog = await this.prisma.callLog.create({
      data: {
        userId,
        clientId: dto.clientId || null,
        fromNumber: settings.virtualPhoneNumber,
        toNumber,
        status: CallStatus.INITIATED,
      },
    });

    try {
      this.logger.log(`Initiating call to ${toNumber} via employee ${employeeId}`);

      const result = await this.jsonRpcRequest<NovofonCallResult>(
        this.CALL_API_URL,
        'start.employee_call',
        {
          first_call: 'employee', // Сначала звоним сотруднику
          virtual_phone_number: settings.virtualPhoneNumber,
          contact: toNumber,
          employee: {
            id: employeeId,
          },
        },
        settings.accessToken,
      );

      // Обновляем статус звонка
      await this.prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          status: CallStatus.SUCCESS,
          novofonCallId: result.call_session_id?.toString(),
        },
      });

      this.logger.log(`Call initiated successfully: session ${result.call_session_id}`);

      return {
        success: true,
        callId: callLog.id,
        callSessionId: result.call_session_id,
      };
    } catch (error) {
      // Обновляем статус при ошибке
      await this.prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          status: CallStatus.FAILED,
          errorMessage: error.message,
        },
      });

      this.logger.error(`Call initiation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получение истории звонков
   */
  async getCallHistory(params: { clientId?: string; limit?: number; offset?: number }) {
    const { clientId, limit = 50, offset = 0 } = params;

    const where = clientId ? { clientId } : {};

    const [calls, total] = await Promise.all([
      this.prisma.callLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          client: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.callLog.count({ where }),
    ]);

    return { calls, total, limit, offset };
  }

  /**
   * Тест подключения к API
   */
  async testConnection() {
    const settings = await this.getSettings();

    if (!settings.accessToken) {
      return { success: false, message: 'API токен не настроен' };
    }

    try {
      const account = await this.jsonRpcRequest<NovofonAccount[]>(
        this.DATA_API_URL,
        'get.account',
        {},
        settings.accessToken,
      );

      if (account && account.length > 0) {
        return {
          success: true,
          message: `Подключено к аккаунту: ${account[0].name}`,
          account: account[0],
        };
      }

      return { success: false, message: 'Не удалось получить данные аккаунта' };
    } catch (error) {
      this.logger.error(`Test connection error: ${error.message}`);
      return { success: false, message: error.message || 'Ошибка подключения' };
    }
  }
}
