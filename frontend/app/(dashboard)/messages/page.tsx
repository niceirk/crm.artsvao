'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConversationList, ChatWindow, EmptyState } from '@/components/chat';
import { ClientCombobox } from '@/components/client-combobox';
import {
  getConversations,
  getConversation,
  getNewMessages,
  sendMessage,
  uploadImage,
  uploadImages,
  updateConversationStatus,
  linkClient,
  markAsRead,
} from '@/lib/api/messages';
import { ConversationStatus } from '@/lib/types/messages';
import type { Conversation, Message } from '@/lib/types/messages';
import { Search, Loader2, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SIDEBAR_COLLAPSED_KEY = 'messages-sidebar-collapsed';

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedChatId = searchParams.get('chat');

  // Состояние списка диалогов
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [search, setSearch] = useState('');
  const [hasUnreadFilter, setHasUnreadFilter] = useState(false);

  // Состояние выбранного диалога
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  // Состояние UI
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [linkClientDialogOpen, setLinkClientDialogOpen] = useState(false);
  const [changeClientWarningOpen, setChangeClientWarningOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);

  // Ref для хранения последней даты проверки
  const lastCheckTimeRef = useRef<string | null>(null);

  // Загрузка состояния сворачивания из localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved) {
      setIsSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  // Сохранение состояния сворачивания
  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(newValue));
      return newValue;
    });
  };

  // Загрузка списка диалогов
  const loadConversations = useCallback(async (searchQuery: string, hasUnread: boolean) => {
    try {
      setIsLoadingList(true);
      const params: any = { page: 1, limit: 50 };

      if (searchQuery) {
        params.search = searchQuery;
      }
      if (hasUnread) {
        params.hasUnread = true;
      }

      const response = await getConversations(params);
      setConversations(response.data || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Не удалось загрузить диалоги');
      setConversations([]);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Debounce поиска
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadConversations(search, hasUnreadFilter);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [search, hasUnreadFilter, loadConversations]);

  // Загрузка выбранного диалога
  const loadConversation = useCallback(async (id: string) => {
    try {
      setIsLoadingConversation(true);
      const response = await getConversation(id);
      setConversation(response.conversation);
      setMessages(response.messages);

      // Обновляем время последней проверки
      if (response.messages.length > 0) {
        lastCheckTimeRef.current = response.messages[response.messages.length - 1].createdAt;
      }

      // Отметить сообщения как прочитанные
      await markAsRead(id);

      // Обновляем счетчик непрочитанных локально, без перезагрузки списка
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === id ? { ...conv, unreadCount: 0 } : conv
        )
      );
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast.error('Не удалось загрузить диалог');
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);

  // Загрузка новых сообщений
  const checkForNewMessages = useCallback(async () => {
    if (!selectedChatId || !lastCheckTimeRef.current) return;

    try {
      const response = await getNewMessages(selectedChatId, lastCheckTimeRef.current);

      // Если есть новые сообщения, добавляем их
      if (response.messages.length > 0) {
        setMessages((prev) => [...prev, ...response.messages]);

        // Обновляем время последней проверки
        const newMessages = response.messages;
        lastCheckTimeRef.current = newMessages[newMessages.length - 1].createdAt;

        // Обновляем статус диалога если изменился
        setConversation((prev) => {
          if (prev && response.conversation.status !== prev.status) {
            return { ...prev, status: response.conversation.status };
          }
          return prev;
        });

        // Обновляем список диалогов
        loadConversations(search, hasUnreadFilter);
      }
    } catch (error) {
      console.error('Failed to fetch new messages:', error);
    }
  }, [selectedChatId, search, hasUnreadFilter, loadConversations]);

  // Эффект для загрузки выбранного диалога
  useEffect(() => {
    if (selectedChatId) {
      loadConversation(selectedChatId);
    } else {
      setConversation(null);
      setMessages([]);
      lastCheckTimeRef.current = null;
    }
  }, [selectedChatId, loadConversation]);

  // Polling для новых сообщений в активном чате
  useEffect(() => {
    if (!selectedChatId) return;

    const interval = setInterval(checkForNewMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedChatId, checkForNewMessages]);

  // Тихое обновление списка диалогов (без спиннера)
  const silentRefreshConversations = useCallback(async () => {
    try {
      const params: any = { page: 1, limit: 50 };
      if (search) params.search = search;
      if (hasUnreadFilter) params.hasUnread = true;

      const response = await getConversations(params);
      setConversations(response.data || []);
    } catch (error) {
      console.error('Failed to refresh conversations:', error);
    }
  }, [search, hasUnreadFilter]);

  // Polling для обновления списка диалогов (каждые 10 секунд)
  useEffect(() => {
    const interval = setInterval(silentRefreshConversations, 10000);
    return () => clearInterval(interval);
  }, [silentRefreshConversations]);

  // Обработчики
  const handleClearSearch = () => {
    setSearch('');
  };

  const handleSelectConversation = (conv: Conversation) => {
    router.push(`/messages?chat=${conv.id}`);
  };

  const handleSendMessage = async (text: string) => {
    if (!conversation) return;

    try {
      const newMessage = await sendMessage(conversation.id, { text });
      setMessages((prev) => [...prev, newMessage]);

      // Обновляем время последней проверки
      lastCheckTimeRef.current = newMessage.createdAt;

      // Обновляем список диалогов
      loadConversations(search, hasUnreadFilter);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Не удалось отправить сообщение');
      throw error;
    }
  };

  const handleSendImage = async (imageFile: File, caption?: string) => {
    if (!conversation) return;

    try {
      const newMessage = await uploadImage(conversation.id, imageFile, caption);
      setMessages((prev) => [...prev, newMessage]);

      // Обновляем время последней проверки
      lastCheckTimeRef.current = newMessage.createdAt;

      // Обновляем список диалогов
      loadConversations(search, hasUnreadFilter);
    } catch (error) {
      console.error('Failed to send image:', error);
      toast.error('Не удалось отправить изображение');
      throw error;
    }
  };

  const handleSendImages = async (imageFiles: File[], caption?: string) => {
    if (!conversation) return;

    try {
      const newMessage = await uploadImages(conversation.id, imageFiles, caption);
      setMessages((prev) => [...prev, newMessage]);

      // Обновляем время последней проверки
      lastCheckTimeRef.current = newMessage.createdAt;

      // Обновляем список диалогов
      loadConversations(search, hasUnreadFilter);
    } catch (error) {
      console.error('Failed to send images:', error);
      toast.error('Не удалось отправить изображение');
      throw error;
    }
  };

  const handleCloseConversation = async () => {
    if (!conversation) return;

    try {
      const updated = await updateConversationStatus(conversation.id, {
        status: ConversationStatus.CLOSED,
      });
      // Сохраняем все данные, обновляя только статус
      setConversation((prev) => prev ? { ...prev, status: updated.status } : updated);
    } catch (error) {
      console.error('Failed to close conversation:', error);
      toast.error('Не удалось закрыть диалог');
    }
  };

  const handleReopenConversation = async () => {
    if (!conversation) return;

    try {
      const updated = await updateConversationStatus(conversation.id, {
        status: ConversationStatus.OPEN,
      });
      // Сохраняем все данные, обновляя только статус
      setConversation((prev) => prev ? { ...prev, status: updated.status } : updated);
    } catch (error) {
      console.error('Failed to reopen conversation:', error);
      toast.error('Не удалось открыть диалог');
    }
  };

  const handleLinkClientSubmit = async () => {
    if (!conversation || !selectedClientId) return;

    try {
      setIsLinking(true);
      const updated = await linkClient(conversation.id, {
        clientId: selectedClientId,
      });
      setConversation(updated);
      setLinkClientDialogOpen(false);
      setSelectedClientId('');
      toast.success('Клиент успешно привязан');
    } catch (error) {
      console.error('Failed to link client:', error);
      toast.error('Не удалось привязать клиента');
    } finally {
      setIsLinking(false);
    }
  };

  const handleChangeClientLink = () => {
    setChangeClientWarningOpen(true);
  };

  const handleConfirmChangeClient = () => {
    setChangeClientWarningOpen(false);
    setLinkClientDialogOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -mx-4 -my-6 md:-mx-6 overflow-hidden">
      {/* Левая панель - Список диалогов */}
      <div
        className={cn(
          'border-r bg-background transition-all duration-300 flex flex-col',
          isSidebarCollapsed ? 'w-0' : 'w-[340px]'
        )}
      >
        <div className={cn('h-full flex flex-col', isSidebarCollapsed && 'hidden')}>
          {/* Заголовок */}
          <div className="flex-shrink-0 px-4 py-3 bg-card">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadConversations(search, hasUnreadFilter)}
                disabled={isLoadingList}
              >
                <RefreshCw
                  className={cn('h-4 w-4', isLoadingList && 'animate-spin')}
                />
              </Button>
              <h2 className="text-lg font-semibold">Сообщения</h2>
            </div>
          </div>

          {/* Поиск и фильтры */}
          <div className="flex-shrink-0 p-4 border-b">
            <div className="space-y-3">
              {/* Поиск */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {search && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Фильтр непрочитанных */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="unread-filter"
                  checked={hasUnreadFilter}
                  onCheckedChange={setHasUnreadFilter}
                />
                <Label htmlFor="unread-filter" className="cursor-pointer text-sm">
                  Только непрочитанные
                </Label>
              </div>
            </div>
          </div>

          {/* Список диалогов */}
          <div className="flex-1 overflow-hidden">
            {isLoadingList ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                onSelect={handleSelectConversation}
                selectedConversationId={selectedChatId || undefined}
              />
            )}
          </div>
        </div>
      </div>

      {/* Кнопка сворачивания */}
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-4 z-20 h-6 w-6 rounded-full border shadow-md"
          onClick={toggleSidebar}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Правая панель - Диалог */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedChatId && conversation ? (
          isLoadingConversation ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ChatWindow
              conversation={conversation}
              messages={messages}
              onSendMessage={handleSendMessage}
              onSendImage={handleSendImage}
              onSendImages={handleSendImages}
              onCloseConversation={handleCloseConversation}
              onReopenConversation={handleReopenConversation}
              onLinkClient={() => setLinkClientDialogOpen(true)}
              onChangeClientLink={handleChangeClientLink}
            />
          )
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Диалог предупреждения об изменении связи */}
      <Dialog open={changeClientWarningOpen} onOpenChange={setChangeClientWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить связь с клиентом?</DialogTitle>
            <DialogDescription>
              Вы собираетесь изменить связь диалога с клиентом
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Текущий клиент:
            </p>
            <p className="text-sm font-medium">
              {conversation?.telegramAccount?.client
                ? `${conversation.telegramAccount.client.lastName} ${conversation.telegramAccount.client.firstName} ${conversation.telegramAccount.client.middleName || ''}`.trim()
                : 'Не привязан'}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              При изменении связи текущая привязка будет заменена на нового клиента.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeClientWarningOpen(false)}
            >
              Отмена
            </Button>
            <Button onClick={handleConfirmChangeClient}>
              Продолжить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог привязки клиента */}
      <Dialog open={linkClientDialogOpen} onOpenChange={setLinkClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Привязать к клиенту</DialogTitle>
            <DialogDescription>
              Выберите клиента для привязки к этому диалогу
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <ClientCombobox
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              placeholder="Выберите клиента..."
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLinkClientDialogOpen(false)}
              disabled={isLinking}
            >
              Отмена
            </Button>
            <Button
              onClick={handleLinkClientSubmit}
              disabled={!selectedClientId || isLinking}
            >
              {isLinking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Привязываю...
                </>
              ) : (
                'Привязать'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
