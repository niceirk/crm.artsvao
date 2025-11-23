import type {
  Conversation,
  ConversationsListParams,
  ConversationsListResponse,
  ConversationDetailsResponse,
  SendMessageDto,
  UpdateConversationStatusDto,
  LinkClientDto,
  MarkAsReadDto,
  Message,
  UploadImageDto,
} from '../types/messages';
import { apiClient } from './client';

/**
 * Получить список диалогов с фильтрацией и пагинацией
 */
export const getConversations = async (
  params?: ConversationsListParams
): Promise<ConversationsListResponse> => {
  const response = await apiClient.get<ConversationsListResponse>(
    '/messages/conversations',
    { params }
  );
  return response.data;
};

/**
 * Получить диалог по ID с историей сообщений
 */
export const getConversation = async (
  id: string
): Promise<ConversationDetailsResponse> => {
  const response = await apiClient.get<ConversationDetailsResponse>(
    `/messages/conversations/${id}`
  );
  return response.data;
};

/**
 * Получить новые сообщения после указанной даты
 */
export const getNewMessages = async (
  conversationId: string,
  after: string
): Promise<ConversationDetailsResponse> => {
  const response = await apiClient.get<ConversationDetailsResponse>(
    `/messages/conversations/${conversationId}/new-messages`,
    { params: { after } }
  );
  return response.data;
};

/**
 * Отправить сообщение клиенту
 */
export const sendMessage = async (
  conversationId: string,
  data: SendMessageDto
): Promise<Message> => {
  const response = await apiClient.post<Message>(
    `/messages/conversations/${conversationId}/send`,
    data
  );
  return response.data;
};

/**
 * Загрузить изображение в диалог
 */
export const uploadImage = async (
  conversationId: string,
  imageFile: File,
  caption?: string
): Promise<Message> => {
  const formData = new FormData();
  formData.append('image', imageFile);

  if (caption) {
    formData.append('caption', caption);
  }

  const response = await apiClient.post<Message>(
    `/messages/conversations/${conversationId}/upload-image`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

/**
 * Загрузить несколько изображений в диалог
 */
export const uploadImages = async (
  conversationId: string,
  imageFiles: File[],
  caption?: string
): Promise<Message> => {
  const formData = new FormData();

  // Добавляем все изображения с одинаковым ключом 'images'
  imageFiles.forEach((file) => {
    formData.append('images', file);
  });

  if (caption) {
    formData.append('caption', caption);
  }

  const response = await apiClient.post<Message>(
    `/messages/conversations/${conversationId}/upload-images`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

/**
 * Обновить статус диалога (открыт/закрыт)
 */
export const updateConversationStatus = async (
  conversationId: string,
  data: UpdateConversationStatusDto
): Promise<Conversation> => {
  const response = await apiClient.patch<Conversation>(
    `/messages/conversations/${conversationId}/status`,
    data
  );
  return response.data;
};

/**
 * Привязать диалог к существующему клиенту
 */
export const linkClient = async (
  conversationId: string,
  data: LinkClientDto
): Promise<Conversation> => {
  const response = await apiClient.post<Conversation>(
    `/messages/conversations/${conversationId}/link-client`,
    data
  );
  return response.data;
};

/**
 * Отметить сообщения как прочитанные менеджером
 */
export const markAsRead = async (
  conversationId: string,
  data?: MarkAsReadDto
): Promise<void> => {
  await apiClient.post(
    `/messages/conversations/${conversationId}/mark-read`,
    data || {}
  );
};

/**
 * Получить общий счётчик непрочитанных входящих сообщений
 */
export const getUnreadMessagesCount = async (): Promise<number> => {
  const response = await apiClient.get<{ count: number }>(`/messages/unread-count`);
  return response.data.count;
};
