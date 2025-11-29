'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEvent } from '@/hooks/use-events';
import { useBreadcrumbs } from '@/lib/contexts/breadcrumbs-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventHeader } from './components/event-header';
import { EventMainInfoCard } from './components/event-main-info-card';
import { EventDetailsInfoCard } from './components/event-details-info-card';
import { EventParticipantsSidebar } from './components/event-participants-sidebar';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { setCustomTitle } = useBreadcrumbs();

  const { data: event, isLoading, error } = useEvent(eventId);

  // Устанавливаем название мероприятия в хлебные крошки
  useEffect(() => {
    if (event?.name) {
      setCustomTitle(event.name);
    }
    return () => setCustomTitle(null);
  }, [event?.name, setCustomTitle]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ошибка при загрузке мероприятия. Попробуйте обновить страницу.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push('/admin/events')}>
            Вернуться к списку мероприятий
          </Button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!event) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Мероприятие не найдено.</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push('/admin/events')}>
            Вернуться к списку мероприятий
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with actions */}
      <EventHeader event={event} />

      {/* Main content - two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Wide column - main info */}
        <div className="space-y-6">
          <EventMainInfoCard event={event} />
          <EventDetailsInfoCard event={event} />
        </div>

        {/* Narrow column - participants sidebar */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <EventParticipantsSidebar event={event} />
        </div>
      </div>
    </div>
  );
}
