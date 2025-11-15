'use client';

import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, Building2 } from 'lucide-react';
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
import { Room } from '@/lib/api/rooms';
import { useDeleteRoom } from '@/hooks/use-rooms';
import { RoomDialog } from './room-dialog';

const roomTypeLabels: Record<string, string> = {
  HALL: 'Зал',
  CLASS: 'Класс',
  STUDIO: 'Студия',
  CONFERENCE: 'Конференц-зал',
};

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  AVAILABLE: 'default',
  MAINTENANCE: 'secondary',
  RETIRED: 'destructive',
};

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Доступно',
  MAINTENANCE: 'На обслуживании',
  RETIRED: 'Не используется',
};

interface RoomsTableProps {
  rooms: Room[];
  isLoading: boolean;
}

export function RoomsTable({ rooms, isLoading }: RoomsTableProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  const deleteRoom = useDeleteRoom();

  const handleEdit = (room: Room) => {
    setSelectedRoom(room);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (room: Room) => {
    setRoomToDelete(room);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (roomToDelete) {
      try {
        await deleteRoom.mutateAsync(roomToDelete.id);
        setIsDeleteDialogOpen(false);
        setRoomToDelete(null);
      } catch (error) {
        // Error is handled by the mutation's onError
        // Keep dialog open so user can see the error
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold">Нет помещений</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Начните с создания первого помещения
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
              <TableHead>Номер</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Вместимость</TableHead>
              <TableHead>Почасовая ставка</TableHead>
              <TableHead>Дневная ставка</TableHead>
              <TableHead>Использование</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="font-medium">{room.name}</TableCell>
                <TableCell>{room.number || '—'}</TableCell>
                <TableCell>{roomTypeLabels[room.type]}</TableCell>
                <TableCell>{room.capacity || '—'}</TableCell>
                <TableCell>{Number(room.hourlyRate).toLocaleString()} ₽/ч</TableCell>
                <TableCell>
                  {room.dailyRate
                    ? `${Number(room.dailyRate).toLocaleString()} ₽/день`
                    : '—'}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {room._count && (
                      <>
                        <div>Расписание: {room._count.schedules}</div>
                        <div>Аренды: {room._count.rentals}</div>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[room.status]}>
                    {statusLabels[room.status]}
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
                      <DropdownMenuItem onClick={() => handleEdit(room)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(room)}
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

      <RoomDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        room={selectedRoom || undefined}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить помещение?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить помещение &quot;{roomToDelete?.name}&quot;?
              {roomToDelete?._count &&
                (roomToDelete._count.schedules > 0 ||
                  roomToDelete._count.rentals > 0) && (
                  <span className="text-destructive font-medium block mt-2">
                    Внимание: помещение используется в расписании или арендах!
                  </span>
                )}
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
            </AlertDialogAction>          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
