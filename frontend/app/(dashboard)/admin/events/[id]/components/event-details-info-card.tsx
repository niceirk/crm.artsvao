'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Event } from '@/lib/api/events';
import {
  FileText,
  StickyNote,
  Link as LinkIcon,
  ExternalLink,
  Hash,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface EventDetailsInfoCardProps {
  event: Event;
}

export function EventDetailsInfoCard({ event }: EventDetailsInfoCardProps) {
  const [isFullDescriptionExpanded, setIsFullDescriptionExpanded] = useState(false);

  const hasDescription = event.description || event.fullDescription;
  const hasNotes = Boolean(event.notes);
  const hasLinks = Boolean(event.timepadLink || event.externalId);
  const hasAnyContent = hasDescription || hasNotes || hasLinks;

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'd MMMM yyyy, HH:mm', { locale: ru });
    } catch {
      return dateString;
    }
  };

  if (!hasAnyContent) {
    return null; // Не показываем карточку если нет данных
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Дополнительная информация
        </CardTitle>
        <CardDescription>Описание, заметки и внешние ссылки</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Описание */}
        {hasDescription && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
              <FileText className="h-4 w-4" />
              Описание мероприятия
            </h4>
            <div className="space-y-3">
              {event.description && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground mb-1">
                    Краткое описание
                  </dt>
                  <dd className="text-sm leading-relaxed">{event.description}</dd>
                </div>
              )}

              {event.fullDescription && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground mb-1">
                    Полное описание
                  </dt>
                  <dd className="text-sm leading-relaxed">
                    {isFullDescriptionExpanded ? (
                      <div className="whitespace-pre-wrap">
                        {event.fullDescription}
                      </div>
                    ) : (
                      <div className="line-clamp-3">{event.fullDescription}</div>
                    )}
                  </dd>
                  {event.fullDescription.length > 150 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setIsFullDescriptionExpanded(!isFullDescriptionExpanded)
                      }
                      className="mt-2 h-8"
                    >
                      {isFullDescriptionExpanded ? (
                        <>
                          <ChevronUp className="mr-2 h-4 w-4" />
                          Свернуть
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-2 h-4 w-4" />
                          Показать полностью
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {hasDescription && hasNotes && <Separator />}

        {/* Заметки */}
        {hasNotes && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
              <StickyNote className="h-4 w-4" />
              Заметки
            </h4>
            <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
              {event.notes}
            </div>
          </div>
        )}

        {(hasDescription || hasNotes) && hasLinks && <Separator />}

        {/* Внешние ссылки */}
        {hasLinks && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
              <LinkIcon className="h-4 w-4" />
              Внешние ссылки
            </h4>
            <div className="space-y-3">
              {event.timepadLink && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground mb-1">
                    Ссылка Timepad
                  </dt>
                  <dd className="flex items-center gap-2">
                    <a
                      href={event.timepadLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex-1 truncate"
                    >
                      {event.timepadLink}
                    </a>
                    <Button size="sm" variant="outline" asChild className="shrink-0">
                      <a
                        href={event.timepadLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </dd>
                </div>
              )}

              {event.externalId && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground mb-1">
                    Внешний идентификатор
                  </dt>
                  <dd className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {event.externalId}
                    </code>
                  </dd>
                </div>
              )}
            </div>
          </div>
        )}

        {(hasDescription || hasNotes || hasLinks) && <Separator />}

        {/* Метаданные */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
            <Clock className="h-4 w-4" />
            Метаданные
          </h4>
          <div className="space-y-2">
            <div className="grid grid-cols-[100px_1fr] gap-2 items-start">
              <dt className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Создано
              </dt>
              <dd className="text-sm">{formatDateTime(event.createdAt)}</dd>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2 items-start">
              <dt className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Обновлено
              </dt>
              <dd className="text-sm">{formatDateTime(event.updatedAt)}</dd>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
