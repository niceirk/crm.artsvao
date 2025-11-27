'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, Calendar, Eye, ArrowUpDown, RefreshCw, X } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useDeleteEvent, useUpdateEvent, useSyncEvents } from '@/hooks/use-events';
import { EventDialog } from './event-dialog';
import { CalendarEventStatus } from '@/lib/api/calendar-event-status';

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

  // Multiple selection state
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  // Filter state
  const [showPastEvents, setShowPastEvents] = useState(false);

  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();
  const syncEvents = useSyncEvents();

  // Handle checkbox selection with Shift support
  const handleSelectEvent = (eventId: string, index: number, shiftKey: boolean) => {
    const newSelected = new Set(selectedEventIds);

    if (shiftKey && lastSelectedIndex !== null) {
      // Select range
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      for (let i = start; i <= end; i++) {
        newSelected.add(sortedEvents[i].id);
      }
    } else {
      // Toggle single selection
      if (newSelected.has(eventId)) {
        newSelected.delete(eventId);
      } else {
        newSelected.add(eventId);
      }
    }

    setSelectedEventIds(newSelected);
    setLastSelectedIndex(index);
  };

  // Select/deselect all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEventIds(new Set(sortedEvents.map(e => e.id)));
    } else {
      setSelectedEventIds(new Set());
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedEventIds(new Set());
    setLastSelectedIndex(null);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedEventIds).map(id => deleteEvent.mutateAsync(id))
      );
      clearSelection();
      setIsBulkDeleteDialogOpen(false);
    } catch (error) {
      // Errors are handled by mutation
    }
  };

  // Bulk status change
  const handleBulkStatusChange = async (status: CalendarEventStatus) => {
    try {
      await Promise.all(
        Array.from(selectedEventIds).map(id =>
          updateEvent.mutateAsync({ id, data: { status } })
        )
      );
      clearSelection();
    } catch (error) {
      // Errors are handled by mutation
    }
  };

  // Bulk sync with Pyrus
  const handleBulkSync = async () => {
    try {
      await syncEvents.mutateAsync(Array.from(selectedEventIds));
      clearSelection();
    } catch (error) {
      // Errors are handled by mutation
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Helper function to check if event is in the past
  const isPastEvent = (event: Event) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  // Filter events (hide past events by default)
  const filteredEvents = showPastEvents
    ? events
    : events.filter(event => !isPastEvent(event));

  const sortedEvents = [...filteredEvents].sort((a, b) => {
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
    // Don't navigate if clicking on a button, link, or checkbox
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[role="checkbox"]')) {
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

  const selectedCount = selectedEventIds.size;
  const allSelected = selectedCount > 0 && selectedCount === sortedEvents.length;
  const someSelected = selectedCount > 0 && selectedCount < sortedEvents.length;

  return (
    <>
      {/* Filter Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-past-events"
            checked={showPastEvents}
            onCheckedChange={(checked) => setShowPastEvents(checked as boolean)}
          />
          <label
            htmlFor="show-past-events"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Показать прошедшие мероприятия
          </label>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">
            Выбрано: {selectedCount}
          </span>
          <div className="flex items-center gap-2">
            <Select onValueChange={(value) => handleBulkStatusChange(value as CalendarEventStatus)}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Изменить статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANNED">Запланировано</SelectItem>
                <SelectItem value="ONGOING">В процессе</SelectItem>
                <SelectItem value="COMPLETED">Завершено</SelectItem>
                <SelectItem value="CANCELLED">Отменено</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkSync}
              disabled={syncEvents.isPending}
              className="h-9"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncEvents.isPending ? 'animate-spin' : ''}`} />
              {syncEvents.isPending ? 'Синхронизация...' : 'Синхронизировать'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              className="h-9"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="ml-auto h-9"
          >
            <X className="mr-2 h-4 w-4" />
            Отменить
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={handleSelectAll}
                  aria-label="Выбрать все"
                />
              </TableHead>
              <SortableHeader field="name">Название</SortableHeader>
              <TableHead>Тип</TableHead>
              <TableHead>Помещение</TableHead>
              <SortableHeader field="date">Дата</SortableHeader>
              <TableHead>Время</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEvents.map((event, index) => (
              <TableRow
                key={event.id}
                onClick={(e) => handleRowClick(event.id, e)}
                className="cursor-pointer hover:bg-muted/50"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedEventIds.has(event.id)}
                    onCheckedChange={(checked) => {
                      const shiftKey = (window.event as MouseEvent)?.shiftKey || false;
                      handleSelectEvent(event.id, index, shiftKey);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Выбрать ${event.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {event.name}
                </TableCell>
                <TableCell>{event.eventType?.name || '—'}</TableCell>
                <TableCell>{getRoomName(event)}</TableCell>
                <TableCell>{formatDate(event.date)}</TableCell>
                <TableCell>
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
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

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить выбранные мероприятия?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить {selectedCount} {selectedCount === 1 ? 'мероприятие' : selectedCount < 5 ? 'мероприятия' : 'мероприятий'}?
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
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
