'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  Clock,
} from 'lucide-react';
import { StatusDropdown } from './status-dropdown';
import { useDeleteEvent } from '@/hooks/use-events';
import { toast } from 'sonner';
import { Event } from '@/lib/api/events';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface EventHeaderProps {
  event: Event;
}

export function EventHeader({ event }: EventHeaderProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteEvent = useDeleteEvent();

  const handleDelete = async () => {
    try {
      await deleteEvent.mutateAsync(event.id);
      toast.success('Мероприятие удалено');
      router.push('/admin/events');
    } catch (error) {
      toast.error('Не удалось удалить мероприятие');
      console.error('Failed to delete event:', error);
    }
  };

  const formatEventDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'd MMMM yyyy', { locale: ru });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      // Обработка ISO формата (1970-01-01T18:00:00.000Z или 1970-01-01T18:00)
      if (timeString.includes('T')) {
        const timePart = timeString.split('T')[1];
        const [hours, minutes] = timePart.split(':');
        return `${hours}:${minutes}`;
      }
      // Обработка формата HH:MM:SS или HH:MM
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    } catch {
      return timeString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-muted-foreground">
        <Link
          href="/admin/events"
          className="flex items-center hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к мероприятиям
        </Link>
      </div>

      {/* Main header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* Title and Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
            <StatusDropdown eventId={event.id} currentStatus={event.status} version={event.version} />
          </div>

          {/* Meta information */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {event.eventType && (
              <span className="flex items-center gap-1">
                {event.eventType.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatEventDate(event.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTime(event.startTime)} - {formatTime(event.endTime)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Pencil className="mr-2 h-4 w-4" />
            Редактировать
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>Дублировать мероприятие</DropdownMenuItem>
              <DropdownMenuItem disabled>Экспорт в PDF</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Отправить уведомление</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить мероприятие?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы действительно хотите удалить мероприятие &quot;{event.name}&quot;? Это
              действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
