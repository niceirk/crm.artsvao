import { TelegramState, ClientStatus } from '@prisma/client';

/**
 * Контекст регистрации на событие
 */
export interface EventRegistrationContext {
  eventId: string;
  step: 'phone' | 'name' | 'birthdate' | 'email' | 'select';
  tempClient?: {
    phone?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    dateOfBirth?: string;
    email?: string;
  };
  [key: string]: unknown; // Index signature для совместимости с Prisma Json
}

/**
 * TelegramAccount с данными клиента
 */
export interface TelegramAccountWithClient {
  id: string;
  telegramUserId: bigint;
  chatId: bigint;
  state: TelegramState;
  clientId: string | null;
  registrationContext: EventRegistrationContext | null;
  isNotificationsEnabled: boolean;
  photoUrl: string | null;
  username: string | null;
  firstName: string;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    dateOfBirth?: Date | null;
    phone?: string | null;
    status: ClientStatus;
    relations?: ClientRelation[];
  } | null;
}

/**
 * Связь клиента
 */
export interface ClientRelation {
  relationType: string;
  relatedClient: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    dateOfBirth?: Date | null;
    status: ClientStatus;
  };
}

/**
 * Опция участника для выбора
 */
export interface ParticipantOption {
  id: string;
  name: string;
  birthYear?: number;
  label?: string;
}

/**
 * Информация о клиенте для выбора
 */
export interface ClientSelectionInfo {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  dateOfBirth?: Date | null;
  phone?: string | null;
}
