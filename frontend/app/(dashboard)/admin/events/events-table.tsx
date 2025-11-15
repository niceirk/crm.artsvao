'use client';

import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, Calendar } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Event } from '@/lib/api/events';
import { useDeleteEvent } from '@/hooks/use-events';
import { EventDialog } from './event-dialog';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PLANNED: 'default',
  ONGOING: 'secondary',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
};

const statusLabels: Record<string, string> = {
  PLANNED: 'Запланировано',
  ONGOING: 'В процессе',
  COMPLETED: 'Завершено',
  CANCELLED: 'Отменено',
};

interface EventsTableProps {
  events: Event[];
  isLoading: boolean;
}

export function EventsTable({ events, isLoading }: EventsTableProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  const deleteEvent = useDeleteEvent();

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (event: Event) => {
    setEventToDelete(event);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (eventToDelete) {
      try {
        await deleteEvent.mutateAsync(eventToDelete.id);
        setIsDeleteDialogOpen(false);
        setEventToDelete(null);
      } catch (error) {
        // Error is handled by the mutation's onError
        // Keep dialog open so user can see the error
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    // Extract time from datetime string (format: "1970-01-01T16:00:00.000Z" or "16:00:00")
    if (timeString.includes('T')) {
      return timeString.split('T')[1].slice(0, 5);
    }
    return timeString.slice(0, 5);
  };

  const getResponsibleName = (event: Event) => {
    if (!event.responsibleUser) return '—';
    return [
      event.responsibleUser.lastName,
      event.responsibleUser.firstName,
    ]
      .filter(Boolean)
      .join(' ');
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold">Нет мероприятий</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Начните с создания первого мероприятия
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Время</TableHead>
              <TableHead>Ответственный</TableHead>
              <TableHead>Участников</TableHead>
              <TableHead>Бюджет</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.name}</TableCell>
                <TableCell>{event.eventType?.name || '—'}</TableCell>
                <TableCell>{formatDate(event.date)}</TableCell>
                <TableCell>
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </TableCell>
                <TableCell>{getResponsibleName(event)}</TableCell>
                <TableCell>{event.participants || '—'}</TableCell>
                <TableCell>
                  {event.budget ? `${event.budget.toLocaleString()} ₽` : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[event.status]}>
                    {statusLabels[event.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Действия</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleEdit(event)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(event)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EventDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        event={selectedEvent || undefined}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить мероприятие?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить мероприятие &quot;{eventToDelete?.name}&quot;?
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
