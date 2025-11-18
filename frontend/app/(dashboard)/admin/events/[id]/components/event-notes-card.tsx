'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Event } from '@/lib/api/events';
import { StickyNote } from 'lucide-react';

interface EventNotesCardProps {
  event: Event;
}

export function EventNotesCard({ event }: EventNotesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="h-5 w-5" />
          Заметки
        </CardTitle>
        <CardDescription>Дополнительные заметки и комментарии</CardDescription>
      </CardHeader>
      <CardContent>
        {event.notes ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {event.notes}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <StickyNote className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Заметок нет</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
