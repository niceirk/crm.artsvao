'use client';

import { useState, useMemo, Fragment } from 'react';
import { MoreHorizontal, Pencil, Trash2, Building2, Laptop, ArrowUp, ArrowDown, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Room, roomsApi } from '@/lib/api/rooms';
import { useDeleteRoom, useUpdateRoom } from '@/hooks/use-rooms';
import { useQueryClient } from '@tanstack/react-query';
import { RoomDialog } from './room-dialog';
import { toast } from 'sonner';

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
  sortDirection?: 'asc' | 'desc';
  onSortChange?: () => void;
}

export function RoomsTable({ rooms, isLoading, sortDirection = 'asc', onSortChange }: RoomsTableProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [editingSortOrder, setEditingSortOrder] = useState<{ id: string; value: string } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());
  const [draggedRoom, setDraggedRoom] = useState<Room | null>(null);
  const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);

  const deleteRoom = useDeleteRoom();
  const updateRoom = useUpdateRoom();
  const queryClient = useQueryClient();

  const toggleGroup = (sortOrder: number) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(sortOrder)) {
        next.delete(sortOrder);
      } else {
        next.add(sortOrder);
      }
      return next;
    });
  };

  // Drag-and-drop обработчики
  const handleDragStart = (e: React.DragEvent, room: Room) => {
    setDraggedRoom(room);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, roomId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRoom(roomId);
  };

  const handleDragLeave = () => {
    setDragOverRoom(null);
  };

  const handleDrop = async (e: React.DragEvent, targetRoom: Room, groupRooms: Room[]) => {
    e.preventDefault();
    setDragOverRoom(null);

    if (!draggedRoom || draggedRoom.id === targetRoom.id) {
      setDraggedRoom(null);
      return;
    }

    // Проверяем, что оба помещения в одной группе (одинаковый sortOrder)
    const draggedSortOrder = draggedRoom.sortOrder ?? 0;
    const targetSortOrder = targetRoom.sortOrder ?? 0;

    if (Math.floor(draggedSortOrder) !== Math.floor(targetSortOrder)) {
      setDraggedRoom(null);
      return;
    }

    // Вычисляем новые sortOrder для перемещения
    const baseSortOrder = Math.floor(targetSortOrder);

    // Убираем перетаскиваемый элемент из списка
    const newOrder = groupRooms.filter((r) => r.id !== draggedRoom.id);

    // Находим индекс целевого элемента ПОСЛЕ фильтрации
    const targetIndex = newOrder.findIndex((r) => r.id === targetRoom.id);

    // Вставляем перетаскиваемый элемент на позицию целевого
    newOrder.splice(targetIndex, 0, draggedRoom);

    console.log('Drag and drop:', {
      dragged: draggedRoom.name,
      target: targetRoom.name,
      targetIndex,
      newOrder: newOrder.map(r => r.name),
    });

    // Пересчитываем sortOrder для всех элементов в группе
    // Используем API напрямую, чтобы избежать race condition
    const updates: Promise<Room>[] = [];

    newOrder.forEach((room, index) => {
      const newSortOrder = baseSortOrder + (index + 1) * 0.001;
      console.log(`${room.name}: ${room.sortOrder} -> ${newSortOrder}`);
      if (Math.abs((room.sortOrder ?? 0) - newSortOrder) > 0.0001) {
        updates.push(roomsApi.updateRoom(room.id, { sortOrder: newSortOrder }));
      }
    });

    console.log('Updates count:', updates.length);

    try {
      await Promise.all(updates);
      // Инвалидируем кэш только один раз после всех обновлений
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Порядок обновлён');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Ошибка обновления порядка');
    }

    setDraggedRoom(null);
  };

  const handleDragEnd = () => {
    setDraggedRoom(null);
    setDragOverRoom(null);
  };

  // Группировка помещений по целой части sortOrder
  const groupedRooms = useMemo(() => {
    const groups = new Map<number, Room[]>();
    rooms.forEach((room) => {
      const sortOrder = room.sortOrder ?? 0;
      const groupKey = Math.floor(sortOrder);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(room);
    });
    // Сортируем ключи групп
    const sortedKeys = Array.from(groups.keys()).sort((a, b) =>
      sortDirection === 'asc' ? a - b : b - a
    );
    return sortedKeys.map((key) => ({
      sortOrder: key,
      // Сортируем комнаты внутри группы по дробной части sortOrder
      rooms: groups.get(key)!.sort((a, b) => {
        const aOrder = a.sortOrder ?? 0;
        const bOrder = b.sortOrder ?? 0;
        return aOrder - bOrder;
      }),
    }));
  }, [rooms, sortDirection]);

  const handleEdit = (room: Room) => {
    setSelectedRoom(room);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (room: Room) => {
    setRoomToDelete(room);
    setIsDeleteDialogOpen(true);
  };

  const handleSortOrderSave = async (roomId: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      try {
        await updateRoom.mutateAsync({ id: roomId, data: { sortOrder: numValue } });
      } catch (error) {
        // Error handled in mutation
      }
    }
    setEditingSortOrder(null);
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
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Номер</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Вместимость</TableHead>
              <TableHead>Почасовая ставка</TableHead>
              <TableHead>Дневная ставка</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-foreground cursor-pointer"
                  onClick={onSortChange}
                >
                  Сортировка
                  {sortDirection === 'asc' ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedRooms.map((group) => (
              <Fragment key={`group-${group.sortOrder}`}>
                {/* Заголовок группы */}
                <TableRow
                  className="bg-muted/50 hover:bg-muted/70 cursor-pointer"
                  onClick={() => toggleGroup(group.sortOrder)}
                >
                  <TableCell colSpan={9} className="py-2">
                    <div className="flex items-center gap-2">
                      {collapsedGroups.has(group.sortOrder) ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium text-muted-foreground">
                        Индекс сортировки: {group.sortOrder} ({group.rooms.length} {group.rooms.length === 1 ? 'помещение' : group.rooms.length < 5 ? 'помещения' : 'помещений'})
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
                {/* Помещения в группе */}
                {!collapsedGroups.has(group.sortOrder) && group.rooms.map((room) => (
              <TableRow
                key={room.id}
                draggable
                onDragStart={(e) => handleDragStart(e, room)}
                onDragOver={(e) => handleDragOver(e, room.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, room, group.rooms)}
                onDragEnd={handleDragEnd}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('input') || target.closest('[role="menu"]')) {
                    return;
                  }
                  handleEdit(room);
                }}
                className={`cursor-pointer hover:bg-muted/50 ${dragOverRoom === room.id ? 'bg-blue-50 border-t-2 border-blue-400' : ''} ${draggedRoom?.id === room.id ? 'opacity-50' : ''}`}
              >
                <TableCell className="w-[40px]">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                </TableCell>
                <TableCell className="font-medium">{room.name}</TableCell>
                <TableCell>{room.number || '—'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {roomTypeLabels[room.type]}
                    {room.isCoworking && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                        <Laptop className="h-3 w-3 mr-1" />
                        Коворкинг
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{room.capacity || '—'}</TableCell>
                <TableCell>{Number(room.hourlyRate).toLocaleString()} ₽/ч</TableCell>
                <TableCell>
                  {room.dailyRate
                    ? `${Number(room.dailyRate).toLocaleString()} ₽/день`
                    : '—'}
                </TableCell>
                <TableCell>
                  {editingSortOrder?.id === room.id ? (
                    <Input
                      type="number"
                      min="0"
                      className="w-16 h-7 text-center"
                      value={editingSortOrder.value}
                      onChange={(e) => setEditingSortOrder({ id: room.id, value: e.target.value })}
                      onBlur={() => handleSortOrderSave(room.id, editingSortOrder.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSortOrderSave(room.id, editingSortOrder.value);
                        } else if (e.key === 'Escape') {
                          setEditingSortOrder(null);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-sm hover:bg-muted px-2 py-1 rounded cursor-pointer"
                      onClick={() => setEditingSortOrder({ id: room.id, value: String(room.sortOrder ?? 0) })}
                    >
                      {room.sortOrder ?? 0}
                    </button>
                  )}
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
              </Fragment>
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
