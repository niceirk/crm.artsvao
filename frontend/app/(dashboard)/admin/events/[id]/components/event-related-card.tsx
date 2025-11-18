'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Event } from '@/lib/api/events';
import { useEvents } from '@/hooks/use-events';
import { MapPin, Tag, Calendar, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface EventRelatedCardProps {
  event: Event;
}

const STATUS_CONFIG = {
  PLANNED: {
    label: 'Запланировано',
    variant: 'default' as const,
  },
  ONGOING: {
    label: 'В процессе',
    variant: 'secondary' as const,
  },
  COMPLETED: {
    label: 'Завершено',
    variant: 'outline' as const,
  },
  CANCELLED: {
    label: 'Отменено',
    variant: 'destructive' as const,
  },
};

export function EventRelatedCard({ event }: EventRelatedCardProps) {
  // Получаем события в том же помещении
  const { data: sameRoomEvents, isLoading: isLoadingRoom } = useEvents();
  // Получаем события того же типа
  const { data: sameTypeEvents, isLoading: isLoadingType } = useEvents();

  // Фильтруем события
  const filteredRoomEvents = (sameRoomEvents || [])
    .filter(
      (e) =>
        e.roomId === event.roomId && // в том же помещении
        e.id !== event.id && // но не текущее событие
        new Date(e.date) >= new Date() // только будущие или сегодняшние
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3); // показываем только 3 ближайших

  const filteredTypeEvents = (sameTypeEvents || [])
    .filter(
      (e) =>
        e.eventTypeId === event.eventTypeId && // того же типа
        e.id !== event.id && // но не текущее событие
        e.roomId !== event.roomId && // в другом помещении (чтобы не дублировать)
        new Date(e.date) >= new Date() // только будущие или сегодняшние
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3); // показываем только 3 ближайших

  const hasRelatedEvents = filteredRoomEvents.length > 0 || filteredTypeEvents.length > 0;
  const isLoading = isLoadingRoom || isLoadingType;

  const formatEventDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'd MMM yyyy', { locale: ru });
    } catch {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Связанные мероприятия
        </CardTitle>
        <CardDescription>
          Другие мероприятия в том же помещении или того же типа
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : hasRelatedEvents ? (
          <div className="space-y-6">
            {/* Events in the same room */}
            {filteredRoomEvents.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <MapPin className="h-4 w-4" />В том же помещении
                  {event.room && (
                    <span className="text-muted-foreground font-normal">
                      ({event.room.name})
                    </span>
                  )}
                </h4>
                <div className="space-y-2">
                  {filteredRoomEvents.map((relatedEvent) => (
                    <Link
                      key={relatedEvent.id}
                      href={`/admin/events/${relatedEvent.id}`}
                      className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {relatedEvent.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatEventDate(relatedEvent.date)}
                          </div>
                        </div>
                        <Badge
                          variant={STATUS_CONFIG[relatedEvent.status].variant}
                          className="shrink-0 text-xs"
                        >
                          {STATUS_CONFIG[relatedEvent.status].label}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Events of the same type */}
            {filteredTypeEvents.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Tag className="h-4 w-4" />
                  Того же типа
                  {event.eventType && (
                    <span className="text-muted-foreground font-normal">
                      ({event.eventType.name})
                    </span>
                  )}
                </h4>
                <div className="space-y-2">
                  {filteredTypeEvents.map((relatedEvent) => (
                    <Link
                      key={relatedEvent.id}
                      href={`/admin/events/${relatedEvent.id}`}
                      className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {relatedEvent.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatEventDate(relatedEvent.date)}
                            {relatedEvent.room && (
                              <>
                                <span>•</span>
                                <MapPin className="h-3 w-3" />
                                {relatedEvent.room.name}
                              </>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={STATUS_CONFIG[relatedEvent.status].variant}
                          className="shrink-0 text-xs"
                        >
                          {STATUS_CONFIG[relatedEvent.status].label}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Связанных мероприятий не найдено</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
