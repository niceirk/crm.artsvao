'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { cn } from '@/lib/utils';
import {
  MoreVertical,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  User,
  Mail,
  Phone,
  Loader2,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import type { Conversation, Message } from '@/lib/types/messages';

interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
  isLoading?: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onSendImage?: (imageFile: File, caption?: string) => Promise<void>;
  onSendImages?: (imageFiles: File[], caption?: string) => Promise<void>;
  onCloseConversation?: () => void;
  onReopenConversation?: () => void;
  onLinkClient?: () => void;
  onChangeClientLink?: () => void;
  onBack?: () => void;
  className?: string;
}

export function ChatWindow({
  conversation,
  messages,
  isLoading = false,
  onSendMessage,
  onSendImage,
  onSendImages,
  onCloseConversation,
  onReopenConversation,
  onLinkClient,
  onChangeClientLink,
  onBack,
  className,
}: ChatWindowProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const isClosed = conversation.status === 'CLOSED';
  const previousMessagesLengthRef = useRef(messages.length);
  const isInitialLoadRef = useRef(true);

  // Автоскролл при новых сообщениях (только если был внизу)
  useEffect(() => {
    if (!scrollRef.current) return;

    const scrollElement = scrollRef.current;
    const isNearBottom =
      scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < 100;

    // Скроллим вниз если:
    // 1. Первая загрузка (при открытии диалога)
    // 2. Добавились новые сообщения И пользователь был близко к низу
    if (isInitialLoadRef.current ||
        (messages.length > previousMessagesLengthRef.current && isNearBottom)) {
      // Используем requestAnimationFrame для гарантированной прокрутки после рендера
      requestAnimationFrame(() => {
        // Пробуем прокрутить через scrollIntoView последнего сообщения
        if (lastMessageRef.current) {
          lastMessageRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        } else if (scrollElement) {
          // Fallback: прокрутка контейнера
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      });
      isInitialLoadRef.current = false;
    }

    previousMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Клиент берется из TelegramAccount
  const client = conversation.telegramAccount?.client;
  const telegramAccount = conversation.telegramAccount;

  const clientName = client
    ? `${client.lastName} ${client.firstName} ${client.middleName || ''}`.trim()
    : telegramAccount
    ? telegramAccount.username ||
      `${telegramAccount.firstName || ''} ${telegramAccount.lastName || ''}`.trim() ||
      'Гость (не привязан)'
    : 'Гость (не привязан)';

  const initials = client
    ? `${client.firstName?.[0] || ''}${client.lastName?.[0] || ''}`.toUpperCase()
    : telegramAccount?.firstName?.[0]?.toUpperCase() || 'Г';

  // Имя для отображения в сообщениях
  const getSenderName = (message: Message): string => {
    if (message.senderType === 'SYSTEM') return 'Система';

    // Для менеджера используем информацию из sender
    if (message.senderType === 'MANAGER' && message.sender) {
      return `${message.sender.lastName} ${message.sender.firstName}`.trim();
    }
    if (message.senderType === 'MANAGER') return 'Менеджер';

    // Для клиента используем имя или username
    if (client) {
      return `${client.lastName} ${client.firstName} ${client.middleName || ''}`.trim();
    }
    if (telegramAccount?.username) {
      return `@${telegramAccount.username}`;
    }
    if (telegramAccount) {
      return `${telegramAccount.firstName || ''} ${telegramAccount.lastName || ''}`.trim() || 'Гость';
    }
    return 'Клиент';
  };

  // Аватар для отображения в сообщениях
  const getSenderAvatar = (message: Message): string | null => {
    if (message.senderType === 'SYSTEM') return null;

    // Для менеджера используем avatarUrl из sender
    if (message.senderType === 'MANAGER' && message.sender) {
      return message.sender.avatarUrl;
    }

    // Для клиента используем photoUrl клиента или telegram аккаунта
    if (client?.photoUrl) {
      return client.photoUrl;
    }
    if (telegramAccount?.photoUrl) {
      return telegramAccount.photoUrl;
    }
    return null;
  };

  // Инициалы для отображения в сообщениях
  const getSenderInitials = (message: Message): string => {
    if (message.senderType === 'SYSTEM') return 'С';

    // Для менеджера используем инициалы из sender
    if (message.senderType === 'MANAGER' && message.sender) {
      return `${message.sender.firstName?.[0] || ''}${message.sender.lastName?.[0] || ''}`.toUpperCase() || 'М';
    }
    if (message.senderType === 'MANAGER') return 'М';

    // Для клиента используем инициалы
    if (client) {
      return `${client.firstName?.[0] || ''}${client.lastName?.[0] || ''}`.toUpperCase() || 'К';
    }
    if (telegramAccount?.firstName) {
      return telegramAccount.firstName[0].toUpperCase();
    }
    return 'К';
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Шапка чата - фиксированная */}
      <div className="flex-shrink-0 bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Кнопка "Назад" */}
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-4">
                {/* ФИО - кликабельное с пунктирным подчеркиванием */}
                {client ? (
                  <h2
                    className="text-lg font-semibold cursor-pointer border-b border-dashed border-muted-foreground/50 hover:border-foreground transition-colors"
                    onClick={() => router.push(`/clients/${client.id}`)}
                    title="Перейти в карточку клиента"
                  >
                    {clientName}
                  </h2>
                ) : (
                  <h2 className="text-lg font-semibold">{clientName}</h2>
                )}

                {/* Телефон и почта на одной строке */}
                {client && (
                  <>
                    {client.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </div>
                    )}
                  </>
                )}

                {/* Статус диалога - кликабельный */}
                {isClosed ? (
                  <Badge
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-accent transition-colors"
                    onClick={onReopenConversation}
                    title="Нажмите, чтобы открыть диалог"
                  >
                    Закрыт
                  </Badge>
                ) : (
                  <Badge
                    variant="default"
                    className="text-xs bg-green-600 hover:bg-green-700 cursor-pointer transition-colors"
                    onClick={onCloseConversation}
                    title="Нажмите, чтобы закрыть диалог"
                  >
                    Открыт
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Меню действий */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!client && onLinkClient && (
                <DropdownMenuItem onClick={onLinkClient}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Привязать к клиенту
                </DropdownMenuItem>
              )}
              {client && onChangeClientLink && (
                <DropdownMenuItem onClick={onChangeClientLink}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Изменить связь
                </DropdownMenuItem>
              )}
              {!isClosed && onCloseConversation && (
                <DropdownMenuItem onClick={onCloseConversation}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Закрыть диалог
                </DropdownMenuItem>
              )}
              {isClosed && onReopenConversation && (
                <DropdownMenuItem onClick={onReopenConversation}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Открыть диалог
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Область сообщений - скролящаяся */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">Сообщений пока нет</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  ref={index === messages.length - 1 ? lastMessageRef : null}
                >
                  <ChatMessage
                    message={message}
                    senderName={getSenderName(message)}
                    senderAvatar={getSenderAvatar(message)}
                    senderInitials={getSenderInitials(message)}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Поле ввода - фиксированное */}
      <div className="flex-shrink-0 border-t bg-card p-4">
        <ChatInput
          onSend={onSendMessage}
          onSendImage={onSendImage}
          onSendImages={onSendImages}
          disabled={isClosed}
          placeholder={
            isClosed
              ? 'Диалог закрыт. Откройте его для отправки сообщений.'
              : 'Введите сообщение...'
          }
        />
      </div>
    </div>
  );
}
