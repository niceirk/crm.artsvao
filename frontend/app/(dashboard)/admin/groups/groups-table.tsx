'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, Users, Copy } from 'lucide-react';
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
import { Group } from '@/lib/api/groups';
import { useDeleteGroup, useCreateGroup } from '@/hooks/use-groups';
import { GroupDialog } from './group-dialog';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
  ARCHIVED: 'destructive',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Активна',
  INACTIVE: 'Неактивна',
  ARCHIVED: 'Архив',
};

interface GroupsTableProps {
  groups: Group[];
  isLoading: boolean;
}

export function GroupsTable({ groups, isLoading }: GroupsTableProps) {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  const deleteGroup = useDeleteGroup();
  const createGroup = useCreateGroup();

  const handleRowClick = (groupId: string) => {
    router.push(`/groups/${groupId}`);
  };

  const handleEdit = (group: Group) => {
    setSelectedGroup(group);
    setIsEditDialogOpen(true);
  };

  const handleCopy = async (group: Group) => {
    const copyData = {
      name: `${group.name} (Копия)`,
      maxParticipants: group.maxParticipants,
      singleSessionPrice: Number(group.singleSessionPrice),
      ageMin: group.ageMin,
      ageMax: group.ageMax,
      status: group.status,
      studioId: group.studioId,
      teacherId: group.teacherId,
      roomId: group.roomId || undefined,
    };
    await createGroup.mutateAsync(copyData);
  };

  const handleDelete = (group: Group) => {
    setGroupToDelete(group);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (groupToDelete) {
      try {
        await deleteGroup.mutateAsync(groupToDelete.id);
        setIsDeleteDialogOpen(false);
        setGroupToDelete(null);
      } catch (error) {
        // Error is handled by the mutation's onError
        // Keep dialog open so user can see the error
      }
    }
  };

  const getTeacherFullName = (teacher: any) => {
    if (!teacher) return '—';
    return [teacher.lastName, teacher.firstName, teacher.middleName]
      .filter(Boolean)
      .join(' ');
  };

  const getAgeRange = (group: Group) => {
    if (!group.ageMin && !group.ageMax) return '—';
    if (group.ageMin && group.ageMax) return `${group.ageMin}-${group.ageMax}`;
    if (group.ageMin) return `от ${group.ageMin}`;
    if (group.ageMax) return `до ${group.ageMax}`;
    return '—';
  };


  if (isLoading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold">Нет групп</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Начните с создания первой группы
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
              <TableHead>Студия</TableHead>
              <TableHead>Преподаватель</TableHead>
              <TableHead>Возраст</TableHead>
              <TableHead>Помещение</TableHead>
              <TableHead>Участников</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Расписание</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow
                key={group.id}
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleRowClick(group.id)}
              >
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell>{group.studio?.name || '—'}</TableCell>
                <TableCell>{getTeacherFullName(group.teacher)}</TableCell>
                <TableCell>{getAgeRange(group)}</TableCell>
                <TableCell>{group.room?.name || '—'}</TableCell>
                <TableCell>
                  {group._count?.subscriptions || 0} / {group.maxParticipants}
                </TableCell>
                <TableCell>
                  {Number(group.singleSessionPrice).toLocaleString()} ₽
                </TableCell>
                <TableCell>
                  {group._count?.schedules || 0}
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[group.status]}>
                    {statusLabels[group.status]}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Действия</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(group); }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopy(group); }}>
                        <Copy className="mr-2 h-4 w-4" />
                        Копировать
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); handleDelete(group); }}
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

      <GroupDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        group={selectedGroup || undefined}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить группу?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить группу &quot;{groupToDelete?.name}&quot;?
              {groupToDelete?._count &&
                (groupToDelete._count.schedules > 0 ||
                  groupToDelete._count.subscriptions > 0) && (
                  <span className="text-destructive font-medium block mt-2">
                    Внимание: в группе есть абонементы ({groupToDelete._count.subscriptions}) или расписание ({groupToDelete._count.schedules})!
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
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
