import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError, throwError } from 'rxjs';
import {
  TimepadOrdersResponse,
  TimepadOrder,
  TimepadOrdersParams,
} from './interfaces/timepad-api.interface';
import {
  TimepadParticipantDto,
  TimepadParticipantsResponseDto,
  TimepadTicketDto,
} from './dto/timepad-orders.dto';

@Injectable()
export class TimepadService {
  private readonly logger = new Logger(TimepadService.name);
  private readonly API_URL = 'https://api.timepad.ru/v1';

  // Timeout для API запросов (15 секунд)
  private readonly API_TIMEOUT_MS = 15000;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Получить токен из конфигурации
   */
  private getToken(): string {
    const token = this.configService.get<string>('TIMEPAD_API_TOKEN');
    if (!token) {
      throw new BadRequestException('TIMEPAD_API_TOKEN не настроен');
    }
    return token;
  }

  /**
   * Извлечь event_id из URL Timepad
   * Поддерживаемые форматы:
   * - https://timepad.ru/event/123456/
   * - https://org.timepad.ru/event/123456/
   * - timepad.ru/event/123456
   */
  extractEventId(timepadLink: string): string | null {
    if (!timepadLink) return null;

    // Регулярное выражение для извлечения event_id
    const patterns = [
      /timepad\.ru\/event\/(\d+)/i,
      /\/event\/(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = timepadLink.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Получить заказы (участников) мероприятия
   */
  async getEventOrders(
    eventId: string,
    params: TimepadOrdersParams = {},
  ): Promise<TimepadOrdersResponse> {
    const token = this.getToken();
    const { limit = 50, skip = 0, email } = params;

    const url = `${this.API_URL}/events/${eventId}/orders`;
    const queryParams = new URLSearchParams();
    queryParams.append('limit', String(limit));
    queryParams.append('skip', String(skip));
    if (email) {
      queryParams.append('email', email);
    }

    this.logger.log(`Запрос участников события ${eventId} с limit=${limit}, skip=${skip}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<TimepadOrdersResponse>(`${url}?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: this.API_TIMEOUT_MS,
        }).pipe(
          timeout(this.API_TIMEOUT_MS),
          catchError((error) => {
            if (error.name === 'TimeoutError') {
              this.logger.error(`Timepad API timeout after ${this.API_TIMEOUT_MS}ms for event ${eventId}`);
              return throwError(() => new HttpException(
                `Превышено время ожидания ответа от Timepad (${this.API_TIMEOUT_MS / 1000} сек)`,
                HttpStatus.GATEWAY_TIMEOUT,
              ));
            }
            return throwError(() => error);
          }),
        ),
      );

      this.logger.log(`Получено ${response.data.values?.length || 0} заказов из ${response.data.total}`);
      return response.data;
    } catch (error: any) {
      // Пробрасываем HttpException как есть (включая timeout ошибки)
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Ошибка при получении заказов: ${error.message}`);

      // Проверяем ответ от Timepad API (он возвращает ошибки в теле ответа)
      const responseData = error.response?.data;
      if (responseData?.response_status?.error_code === 403) {
        throw new BadRequestException('Нет доступа к заказам этого мероприятия. Убедитесь, что токен имеет права view_visitors и мероприятие принадлежит вашей организации.');
      }
      if (responseData?.response_status?.error_code === 404) {
        throw new BadRequestException('Мероприятие не найдено в Timepad');
      }
      if (responseData?.response_status?.error_code === 401) {
        throw new BadRequestException('Неверный токен Timepad API');
      }

      // HTTP статусы
      if (error.response?.status === 401) {
        throw new BadRequestException('Неверный токен Timepad API');
      }
      if (error.response?.status === 404) {
        throw new BadRequestException('Мероприятие не найдено в Timepad');
      }
      if (error.response?.status === 403) {
        throw new BadRequestException('Нет доступа к заказам этого мероприятия');
      }
      throw new BadRequestException(`Ошибка Timepad API: ${error.message}`);
    }
  }

  /**
   * Получить участников мероприятия по ссылке Timepad
   */
  async getParticipantsByLink(
    timepadLink: string,
    params: TimepadOrdersParams = {},
  ): Promise<TimepadParticipantsResponseDto> {
    const eventId = this.extractEventId(timepadLink);
    if (!eventId) {
      throw new BadRequestException('Не удалось извлечь ID мероприятия из ссылки Timepad');
    }

    const ordersResponse = await this.getEventOrders(eventId, params);
    return this.transformOrdersToParticipants(ordersResponse);
  }

  /**
   * Преобразовать заказы в список участников
   */
  private transformOrdersToParticipants(
    response: TimepadOrdersResponse,
  ): TimepadParticipantsResponseDto {
    const participants: TimepadParticipantDto[] = (response.values || []).map((order) =>
      this.transformOrderToParticipant(order),
    );

    return {
      total: response.total,
      participants,
    };
  }

  /**
   * Преобразовать заказ в участника
   */
  private transformOrderToParticipant(order: TimepadOrder): TimepadParticipantDto {
    // Пытаемся извлечь имя из ответов анкеты
    const name = this.extractNameFromOrder(order);

    // Определяем статус оплаты
    const isPaid = order.status?.name === 'ok' || order.status?.name === 'paid';

    // Преобразуем билеты
    const tickets: TimepadTicketDto[] = order.tickets.map((ticket) => ({
      id: ticket.id,
      number: ticket.number,
      price: ticket.price_nominal,
      ticketType: ticket.ticket_type?.name || 'Стандартный',
    }));

    return {
      id: order.id,
      email: order.mail,
      name,
      status: order.status?.name || 'unknown',
      statusTitle: order.status?.title || 'Неизвестно',
      createdAt: order.created_at,
      isPaid,
      paymentAmount: order.payment?.amount || null,
      tickets,
    };
  }

  /**
   * Извлечь имя участника из ответов анкеты
   */
  private extractNameFromOrder(order: TimepadOrder): string {
    // Ищем в ответах на вопросы анкеты
    for (const ticket of order.tickets) {
      if (ticket.answers) {
        // Проверяем, является ли answers объектом или массивом
        if (!Array.isArray(ticket.answers)) {
          // answers - это объект с полями name, surname, etc.
          const answers = ticket.answers as { name?: string; surname?: string; [key: string]: string | undefined };

          // Собираем ФИО из surname и name
          const parts: string[] = [];
          if (answers.surname?.trim()) {
            parts.push(answers.surname.trim());
          }
          if (answers.name?.trim()) {
            parts.push(answers.name.trim());
          }

          if (parts.length > 0) {
            return parts.join(' ');
          }
        } else {
          // answers - это массив (старый формат)
          for (const answer of ticket.answers) {
            const nameFieldIds = ['name', 'surname', 'firstname', 'lastname', 'fio'];
            const lowerFieldId = answer.field_id?.toLowerCase() || '';
            const lowerName = answer.name?.toLowerCase() || '';

            if (
              nameFieldIds.some((id) => lowerFieldId.includes(id) || lowerName.includes(id)) ||
              lowerName.includes('имя') ||
              lowerName.includes('фио') ||
              lowerName.includes('фамилия')
            ) {
              if (answer.value && answer.value.trim()) {
                return answer.value.trim();
              }
            }
          }
        }
      }
    }

    // Если имя не найдено, используем email (часть до @)
    return order.mail?.split('@')[0] || 'Участник';
  }
}
