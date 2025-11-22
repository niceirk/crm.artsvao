'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Conversation } from '@/lib/types/messages';
import { MessageCircle } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  onSelect: (conversation: Conversation) => void;
  className?: string;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelect,
  className,
}: ConversationListProps) {
  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="p-2">
        {!conversations || conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Пока нет диалогов
            </p>
          </div>
        ) : (
          conversations.map((conversation, index) => (
            <div key={conversation.id}>
              <ConversationCard
                conversation={conversation}
                isSelected={conversation.id === selectedConversationId}
                onClick={() => onSelect(conversation)}
              />
              {index < conversations.length - 1 && <Separator className="my-1" />}
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

interface ConversationCardProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

// Функция умного форматирования времени
function formatMessageTime(date: Date): string {
  if (isToday(date)) {
    // Сегодня - только время
    return format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    // Вчера
    return 'Вчера';
  } else if (isThisYear(date)) {
    // Этот год - день и месяц
    return format(date, 'd MMM', { locale: ru });
  } else {
    // Прошлые года - полная дата
    return format(date, 'dd.MM.yyyy');
  }
}

function ConversationCard({
  conversation,
  isSelected,
  onClick,
}: ConversationCardProps) {
  // Клиент берется из TelegramAccount
  const client = conversation.telegramAccount?.client;
  const telegramAccount = conversation.telegramAccount;

  // Имя: для привязанных - ФИО, для неавторизованных - @username из Telegram
  const clientName = client
    ? `${client.lastName} ${client.firstName} ${client.middleName || ''}`.trim()
    : telegramAccount?.username
    ? `@${telegramAccount.username}`
    : `${telegramAccount?.firstName || ''} ${telegramAccount?.lastName || ''}`.trim() || 'Гость';

  // Телефон клиента (если есть)
  const clientPhone = client?.phone;

  const initials = client
    ? `${client.firstName?.[0] || ''}${client.lastName?.[0] || ''}`.toUpperCase()
    : telegramAccount?.username?.[0]?.toUpperCase() ||
      telegramAccount?.firstName?.[0]?.toUpperCase() || 'Г';

  const hasUnread = (conversation.unreadCount ?? 0) > 0;

  return (
    <div
      className={cn(
        'px-4 py-3 cursor-pointer transition-all rounded-lg bg-white dark:bg-gray-900',
        'hover:bg-blue-50 dark:hover:bg-blue-950/30',
        isSelected && 'bg-blue-50 dark:bg-blue-950/30'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Аватар */}
        <Avatar className="h-12 w-12 shrink-0">
          {telegramAccount?.photoUrl && (
            <AvatarImage src={telegramAccount.photoUrl} alt={clientName} />
          )}
          {client?.photoUrl && (
            <AvatarImage src={client.photoUrl} alt={clientName} />
          )}
          <AvatarFallback className="text-base">{initials}</AvatarFallback>
        </Avatar>

        {/* Информация */}
        <div className="flex-1 min-w-0">
          {/* Заголовок: имя и время */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Бейдж непрочитанных - слева от имени */}
              {hasUnread && (
                <Badge
                  variant="default"
                  className="shrink-0 h-5 w-5 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold p-0"
                >
                  {conversation.unreadCount}
                </Badge>
              )}

              <h3
                className={cn(
                  'text-sm truncate',
                  hasUnread ? 'font-semibold' : 'font-medium'
                )}
              >
                {clientName}
              </h3>
            </div>

            {/* Время последнего сообщения */}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatMessageTime(new Date(conversation.lastMessageAt))}
            </span>
          </div>

          {/* Последнее сообщение - ровно 2 строки */}
          <div className="flex items-start gap-2">
            {conversation.lastMessage && (
              <p
                className={cn(
                  'text-sm line-clamp-2 flex-1',
                  hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {conversation.lastMessage.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
