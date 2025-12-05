/**
 * Типы для модуля сообщений Telegram
 */

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageSenderType {
  CLIENT = 'CLIENT',
  MANAGER = 'MANAGER',
  SYSTEM = 'SYSTEM',
}

export enum MessageCategory {
  PAYMENT = 'PAYMENT',
  SCHEDULE = 'SCHEDULE',
  REMINDER = 'REMINDER',
  CHAT = 'CHAT',
}

export enum ConversationSource {
  TELEGRAM = 'TELEGRAM',
}

export enum ConversationStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export interface TelegramAccount {
  id: string;
  clientId?: string | null;
  telegramUserId: string;
  chatId?: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl?: string | null;
  isNotificationsEnabled?: boolean;
  state?: string | null;
  createdAt?: string;
  updatedAt?: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    phone: string | null;
    email: string | null;
    photoUrl: string | null;
    dateOfBirth?: string | null;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  senderType: MessageSenderType;
  senderId?: string | null;
  text: string;
  payload: Record<string, any> | null;
  category: MessageCategory | null;
  createdAt: string;
  isReadByClient: boolean;
  isReadByManager: boolean;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
}

export interface Conversation {
  id: string;
  channelAccountId: string;
  source: ConversationSource;
  status: ConversationStatus;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;

  // Связи (если загружены)
  telegramAccount?: TelegramAccount;
  messages?: Message[];

  // Вспомогательные поля
  unreadCount?: number;
  lastMessage?: Message;
}

export interface ConversationsListParams {
  page?: number;
  limit?: number;
  status?: ConversationStatus;
  hasUnread?: boolean;
  search?: string;
}

export interface ConversationsListResponse {
  data: Conversation[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ConversationDetailsResponse {
  conversation: Conversation;
  messages: Message[];
}

export interface SendMessageDto {
  text: string;
}

export interface UpdateConversationStatusDto {
  status: ConversationStatus;
}

export interface LinkClientDto {
  clientId: string;
}

export interface MarkAsReadDto {
  messageIds?: string[];
}

/**
 * Payload изображения в сообщении
 */
export interface ImagePayload {
  imageUrl: string;
  fileName: string;
  fileSize: number;
  width?: number;
  height?: number;
  mimeType?: string;
  telegramFileId?: string;
  telegramFileUrl?: string;
}

/**
 * Payload множественных изображений в сообщении
 */
export interface ImagesPayload {
  images: ImagePayload[];
}

/**
 * DTO для загрузки изображения
 */
export interface UploadImageDto {
  caption?: string;
}
