'use client';

import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, Tag } from 'lucide-react';
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
import { EventType } from '@/lib/api/event-types';
import { useDeleteEventType } from '@/hooks/use-event-types';
import { EventTypeDialog } from './event-type-dialog';

interface EventTypesTableProps {
  eventTypes: EventType[];
  isLoading: boolean;
}

export function EventTypesTable({ eventTypes, isLoading }: EventTypesTableProps) {
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventTypeToDelete, setEventTypeToDelete] = useState<EventType | null>(null);

  const deleteEventType = useDeleteEventType();

  const handleEdit = (eventType: EventType) => {
    setSelectedEventType(eventType);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (eventType: EventType) => {
    setEventTypeToDelete(eventType);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (eventTypeToDelete) {
      try {
        await deleteEventType.mutateAsync(eventTypeToDelete.id);
        setIsDeleteDialogOpen(false);
        setEventTypeToDelete(null);
      } catch (error) {
        // Error is handled by the mutation's onError
        // Keep dialog open so user can see the error
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  if (eventTypes.length === 0) {
    return (
      <div className="text-center py-8">
        <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold">Нет типов мероприятий</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Начните с создания первого типа
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
              <TableHead className="w-[50px]">Цвет</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventTypes.map((eventType) => (
              <TableRow key={eventType.id}>
                <TableCell>
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: eventType.color || '#3b82f6' }}
                  />
                </TableCell>
                <TableCell className="font-medium">{eventType.name}</TableCell>
                <TableCell className="max-w-md text-sm text-muted-foreground">
                  {eventType.description || '—'}
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
                      <DropdownMenuItem onClick={() => handleEdit(eventType)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(eventType)}
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

      <EventTypeDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        eventType={selectedEventType || undefined}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тип мероприятия?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить тип &quot;{eventTypeToDelete?.name}&quot;?
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
