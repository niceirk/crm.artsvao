'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, CheckCheck } from 'lucide-react';
import type { Message, ImagePayload, ImagesPayload } from '@/lib/types/messages';
import { ImageViewerModal } from './image-viewer-modal';

interface ChatMessageProps {
  message: Message;
  senderName?: string;
  senderAvatar?: string | null;
  senderInitials?: string;
  className?: string;
}

export function ChatMessage({
  message,
  senderName,
  senderAvatar,
  senderInitials = '?',
  className
}: ChatMessageProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const isInbound = message.direction === 'INBOUND';
  const isSystem = message.senderType === 'SYSTEM';
  const isOutbound = message.direction === 'OUTBOUND';

  // Проверяем наличие изображений в payload
  const imagesPayload = message.payload as ImagesPayload | undefined;
  const imagePayload = message.payload as ImagePayload | undefined;

  // Поддержка как одного изображения (старый формат), так и множественных
  const images = imagesPayload?.images || (imagePayload?.imageUrl ? [imagePayload] : []);
  const hasImages = images.length > 0;

  // Определяем отображаемое имя отправителя
  let displayName = senderName;
  if (!displayName) {
    displayName = {
      CLIENT: 'Клиент',
      MANAGER: 'Менеджер',
      SYSTEM: 'Система',
    }[message.senderType];
  }

  // Определяем статус сообщения (для исходящих сообщений)
  const getMessageStatus = () => {
    if (!isOutbound || isSystem) return null;

    if (message.isReadByClient) {
      return <CheckCheck className="h-3.5 w-3.5 text-white" />;
    }
    return <Check className="h-3.5 w-3.5 text-white/70" />;
  };

  // Форматируем время отправки (HH:mm)
  const timeText = format(new Date(message.createdAt), 'HH:mm', { locale: ru });

  // Системное сообщение
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="px-4 py-2 rounded-lg bg-muted border border-border text-muted-foreground text-sm italic max-w-[85%] text-center">
          <p className="whitespace-pre-wrap">{message.text}</p>
          {message.category && (
            <Badge variant="outline" className="mt-2 text-xs">
              {getCategoryLabel(message.category)}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-3 mb-2',
        className
      )}
    >
      {/* Аватар */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        {senderAvatar && <AvatarImage src={senderAvatar} alt={displayName} />}
        <AvatarFallback className="text-xs">
          {senderInitials}
        </AvatarFallback>
      </Avatar>

      {/* Контент сообщения */}
      <div className="relative max-w-[65%]">
        {/* Баллон сообщения */}
        <div
          className={cn(
            'relative rounded-2xl rounded-tl-none overflow-hidden',
            // Для исходящих с фото без фона
            isOutbound && hasImages ? '' : 'shadow-sm',
            // Фон только для сообщений без фото или входящих
            !hasImages || isInbound
              ? isInbound
                ? 'bg-blue-50 dark:bg-blue-950/30 text-foreground'
                : 'bg-blue-600 dark:bg-blue-700 text-white'
              : '',
            hasImages ? (isOutbound && !message.text ? '' : 'p-1') : 'px-3 py-2'
          )}
        >
          {/* Галерея изображений если есть */}
          {hasImages && (
            <div className={cn(
              'relative',
              images.length > 1 ? 'grid gap-1' : '',
              images.length === 2 ? 'grid-cols-2' : '',
              images.length === 3 ? 'grid-cols-3' : '',
              images.length === 4 ? 'grid-cols-2' : '',
              images.length > 4 ? 'grid-cols-3' : ''
            )}>
              {images.slice(0, 6).map((img, index) => (
                <div
                  key={index}
                  className={cn(
                    'relative',
                    images.length === 1 ? 'max-w-md' : 'aspect-square'
                  )}
                >
                  <img
                    src={img.imageUrl}
                    alt={img.fileName || `Изображение ${index + 1}`}
                    className={cn(
                      'w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity',
                      images.length === 1 ? '' : 'h-full object-cover'
                    )}
                    onClick={() => {
                      setSelectedImageIndex(index);
                      setViewerOpen(true);
                    }}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7QntGI0LjQsdC60LAg0LfQsNCz0YDRg9C30LrQuDwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                  {/* Индикатор "еще N фото" для последнего элемента если их больше 6 */}
                  {index === 5 && images.length > 6 && (
                    <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center text-white font-semibold text-lg">
                      +{images.length - 6}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Текст сообщения (caption) если есть */}
          {message.text && (
            <p className={cn(
              'text-sm whitespace-pre-wrap break-words',
              // Для исходящих с фото добавляем фон под текст
              isOutbound && hasImages && 'bg-blue-600 dark:bg-blue-700 text-white rounded-lg',
              hasImages ? 'px-2 py-1.5 pr-16' : 'pr-16'
            )}>
              {message.text}
            </p>
          )}

          {/* Время и статус в правом нижнем углу */}
          <div className={cn(
            'absolute bottom-1.5 right-2 flex items-center gap-1',
            hasImages && !message.text && 'bg-black/50 rounded px-1.5 py-0.5'
          )}>
            <span className={cn(
              'text-[11px] leading-none',
              isOutbound || (hasImages && !message.text) ? 'text-white/90' : 'text-muted-foreground'
            )}>
              {timeText}
            </span>
            {getMessageStatus()}
          </div>
        </div>

        {/* Имя отправителя под сообщением (только для входящих от клиентов) */}
        {isInbound && (
          <div className="text-[11px] text-muted-foreground px-2 mt-0.5">
            {displayName}
          </div>
        )}
      </div>

      {/* Модальное окно для просмотра изображений */}
      {hasImages && images[selectedImageIndex] && (
        <ImageViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          imageUrl={images[selectedImageIndex].imageUrl}
          caption={message.text}
          fileName={images[selectedImageIndex].fileName}
        />
      )}
    </div>
  );
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    PAYMENT: 'Платеж',
    SCHEDULE: 'Расписание',
    REMINDER: 'Напоминание',
    CHAT: 'Сообщение',
  };
  return labels[category] || category;
}
