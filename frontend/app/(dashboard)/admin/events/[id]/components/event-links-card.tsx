'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Event } from '@/lib/api/events';
import { Link as LinkIcon, ExternalLink, Hash } from 'lucide-react';

interface EventLinksCardProps {
  event: Event;
}

export function EventLinksCard({ event }: EventLinksCardProps) {
  const hasLinks = event.timepadLink || event.externalId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Внешние ссылки
        </CardTitle>
        <CardDescription>Ссылки на внешние ресурсы и идентификаторы</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {event.timepadLink && (
          <div>
            <dt className="text-sm font-medium text-muted-foreground mb-2">
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
              <Button size="sm" variant="outline" asChild>
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
            <dt className="text-sm font-medium text-muted-foreground mb-2">
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

        {!hasLinks && (
          <div className="text-center py-4 text-muted-foreground">
            <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Внешние ссылки не указаны</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
