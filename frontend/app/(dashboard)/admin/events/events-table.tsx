'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, Calendar, Eye, ArrowUpDown } from 'lucide-react';
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

type SortField = 'name' | 'date' | 'participants' | 'budget';
type SortDirection = 'asc' | 'desc';

interface EventsTableProps {
  events: Event[];
  isLoading: boolean;
}

export function EventsTable({ events, isLoading }: EventsTableProps) {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const deleteEvent = useDeleteEvent();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedEvents = [...events].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name, 'ru');
        break;
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'participants':
        comparison = (a.participants || 0) - (b.participants || 0);
        break;
      case 'budget':
        comparison = (a.budget || 0) - (b.budget || 0);
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleRowClick = (eventId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking on a button or link
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    router.push(`/admin/events/${eventId}`);
  };

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

  const getRoomName = (event: Event) => {
    if (!event.room) return '—';
    if (event.room.number) {
      return `${event.room.name} (${event.room.number})`;
    }
    return event.room.name;
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

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead>
      <Button
        variant="ghost"
        onClick={() => handleSort(field)}
        className="h-8 px-2 lg:px-3 hover:bg-transparent font-medium"
      >
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="name">Название</SortableHeader>
              <TableHead>Тип</TableHead>
              <TableHead>Помещение</TableHead>
              <SortableHeader field="date">Дата</SortableHeader>
              <TableHead>Время</TableHead>
              <TableHead>Ответственный</TableHead>
              <SortableHeader field="participants">Участников</SortableHeader>
              <TableHead>Статус</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEvents.map((event) => (
              <TableRow
                key={event.id}
                onClick={(e) => handleRowClick(event.id, e)}
                className="cursor-pointer hover:bg-muted/50"
              >
                <TableCell className="font-medium">
                  {event.name}
                </TableCell>
                <TableCell>{event.eventType?.name || '—'}</TableCell>
                <TableCell>{getRoomName(event)}</TableCell>
                <TableCell>{formatDate(event.date)}</TableCell>
                <TableCell>
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </TableCell>
                <TableCell>{getResponsibleName(event)}</TableCell>
                <TableCell>{event.participants || '—'}</TableCell>
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
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/events/${event.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Просмотреть
                        </Link>
                      </DropdownMenuItem>
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
