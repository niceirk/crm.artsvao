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
import { Event } from '@/lib/api/events';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface EventDescriptionCardProps {
  event: Event;
}

export function EventDescriptionCard({ event }: EventDescriptionCardProps) {
  const [isFullDescriptionExpanded, setIsFullDescriptionExpanded] = useState(false);
  const hasDescription = event.description || event.fullDescription;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Описание мероприятия
        </CardTitle>
        <CardDescription>Краткая и полная информация о мероприятии</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {event.description && (
          <div>
            <dt className="text-sm font-medium text-muted-foreground mb-2">
              Краткое описание
            </dt>
            <dd className="text-sm leading-relaxed">{event.description}</dd>
          </div>
        )}

        {event.fullDescription && (
          <div>
            <dt className="text-sm font-medium text-muted-foreground mb-2">
              Полное описание
            </dt>
            <dd className="text-sm leading-relaxed">
              {isFullDescriptionExpanded ? (
                <div className="whitespace-pre-wrap">{event.fullDescription}</div>
              ) : (
                <div className="line-clamp-3">{event.fullDescription}</div>
              )}
            </dd>
            {event.fullDescription.length > 150 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullDescriptionExpanded(!isFullDescriptionExpanded)}
                className="mt-2"
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

        {!hasDescription && (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Описание не указано</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
