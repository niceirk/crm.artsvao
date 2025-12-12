import { Injectable } from '@nestjs/common';
import {
  TelegramReplyKeyboardMarkup,
  TelegramInlineKeyboardButton,
} from '../interfaces/telegram-api.interface';
import { ClientSelectionInfo, ParticipantOption } from '../interfaces/state-context.interface';
import { formatClientName, escapeHtml, formatDate, formatTime } from '../utils/format.util';

/**
 * Сервис для построения клавиатур Telegram
 * Содержит чистые функции без side effects
 */
@Injectable()
export class TelegramKeyboardService {
  /**
   * Клавиатура с запросом контакта
   */
  buildContactRequestKeyboard(): TelegramReplyKeyboardMarkup {
    return {
      keyboard: [
        [
          {
            text: '📱 Поделиться номером телефона',
            request_contact: true,
          },
        ],
        [
          {
            text: '❌ Просто написать',
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  /**
   * Клавиатура с запросом контакта для регистрации на событие
   */
  buildEventContactRequestKeyboard(): TelegramReplyKeyboardMarkup {
    return {
      keyboard: [
        [
          {
            text: '📱 Поделиться номером телефона',
            request_contact: true,
          },
        ],
        [
          {
            text: '❌ Отмена',
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  /**
   * Inline клавиатура для выбора клиента
   */
  buildClientSelectionKeyboard(clients: ClientSelectionInfo[]): TelegramInlineKeyboardButton[][] {
    const keyboard: TelegramInlineKeyboardButton[][] = clients.map((client) => {
      const displayText = formatClientName(
        client.firstName,
        client.lastName,
        client.middleName,
        client.dateOfBirth
      );

      return [
        {
          text: displayText,
          callback_data: `select_client_${client.id}`,
        },
      ];
    });

    // Добавляем кнопку "Это не я" БЕЗ эмодзи
    keyboard.push([
      {
        text: 'Нет моего имени в списке',
        callback_data: 'skip_identification',
      },
    ]);

    return keyboard;
  }

  /**
   * Inline клавиатура приветствия для новых пользователей
   */
  buildWelcomeKeyboard(): TelegramInlineKeyboardButton[][] {
    return [
      [{ text: '📱 Идентифицироваться по номеру', callback_data: 'start_identification' }],
      [{ text: '💬 Задать вопрос', callback_data: 'ask_question' }],
    ];
  }

  /**
   * Inline клавиатура для идентифицированных пользователей
   */
  buildIdentifiedUserKeyboard(): TelegramInlineKeyboardButton[][] {
    return [
      [{ text: '💬 Написать сообщение', callback_data: 'write_message' }],
      [{ text: 'ℹ️ Информация о занятиях', callback_data: 'class_info' }],
    ];
  }

  /**
   * Inline клавиатура для выбора участника события
   */
  buildEventParticipantKeyboard(participants: ParticipantOption[]): TelegramInlineKeyboardButton[][] {
    const keyboard: TelegramInlineKeyboardButton[][] = participants.map((p) => {
      // Имя уже отформатировано в вызывающем коде через formatClientName
      let displayText = p.name;
      if (p.label) {
        displayText += ` — ${p.label}`;
      }

      return [
        {
          text: displayText,
          callback_data: `sel_part_${p.id}`,
        },
      ];
    });

    // Добавляем кнопку "Новый участник" БЕЗ эмодзи
    keyboard.push([
      {
        text: 'Другой участник',
        callback_data: 'new_participant',
      },
    ]);

    // Добавляем кнопку отмены БЕЗ эмодзи
    keyboard.push([
      {
        text: 'Отмена',
        callback_data: 'cancel_event_reg',
      },
    ]);

    return keyboard;
  }

  /**
   * Inline клавиатура регистрации на событие
   */
  buildEventRegistrationKeyboard(eventId: string): TelegramInlineKeyboardButton[][] {
    return [
      [{ text: '✅ Зарегистрироваться', callback_data: `register_event_${eventId}` }],
    ];
  }

  /**
   * Inline клавиатура с пропуском email
   */
  buildSkipEmailKeyboard(): TelegramInlineKeyboardButton[][] {
    return [
      [{ text: '⏭️ Пропустить', callback_data: 'skip_email' }],
      [{ text: '❌ Отмена', callback_data: 'cancel_event_reg' }],
    ];
  }

  /**
   * Inline клавиатура отмены
   */
  buildCancelKeyboard(): TelegramInlineKeyboardButton[][] {
    return [
      [{ text: '❌ Отмена', callback_data: 'cancel_event_reg' }],
    ];
  }

  /**
   * Экранирование специальных символов HTML
   * @deprecated Используйте escapeHtml из utils/format.util.ts
   */
  escapeHtml(text: string): string {
    return escapeHtml(text);
  }

  /**
   * Форматирование даты для отображения
   * @deprecated Используйте formatDate из utils/format.util.ts
   */
  formatDate(date: Date): string {
    return formatDate(date);
  }

  /**
   * Форматирование времени для отображения
   * @deprecated Используйте formatTime из utils/format.util.ts
   */
  formatTime(date: Date): string {
    return formatTime(date);
  }
}
