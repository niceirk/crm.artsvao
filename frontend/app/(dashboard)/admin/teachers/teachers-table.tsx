'use client';

import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, UserCircle } from 'lucide-react';
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
import { Teacher } from '@/lib/api/teachers';
import { useDeleteTeacher } from '@/hooks/use-teachers';
import { TeacherDialog } from './teacher-dialog';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  ON_LEAVE: 'secondary',
  RETIRED: 'destructive',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Активен',
  ON_LEAVE: 'В отпуске',
  RETIRED: 'Уволен',
};

interface TeachersTableProps {
  teachers: Teacher[];
  isLoading: boolean;
}

export function TeachersTable({ teachers, isLoading }: TeachersTableProps) {
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  const deleteTeacher = useDeleteTeacher();

  const handleEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (teacherToDelete) {
      try {
        await deleteTeacher.mutateAsync(teacherToDelete.id);
        setIsDeleteDialogOpen(false);
        setTeacherToDelete(null);
      } catch (error) {
        // Error is handled by the mutation's onError
        // Keep dialog open so user can see the error
      }
    }
  };

  const getFullName = (teacher: Teacher) => {
    return [teacher.lastName, teacher.firstName, teacher.middleName]
      .filter(Boolean)
      .join(' ');
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  if (teachers.length === 0) {
    return (
      <div className="text-center py-8">
        <UserCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold">Нет преподавателей</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Начните с создания первого преподавателя
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
              <TableHead>ФИО</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Специализация</TableHead>
              <TableHead>Процент</TableHead>
              <TableHead>Использование</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell className="font-medium">
                  {getFullName(teacher)}
                </TableCell>
                <TableCell>{teacher.phone || '—'}</TableCell>
                <TableCell>{teacher.email || '—'}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {teacher.specialization || '—'}
                </TableCell>
                <TableCell>
                  {teacher.salaryPercentage ? `${teacher.salaryPercentage}%` : '—'}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {teacher._count && (
                      <>
                        <div>Группы: {teacher._count.groups}</div>
                        <div>Расписание: {teacher._count.schedules}</div>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[teacher.status]}>
                    {statusLabels[teacher.status]}
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
                      <DropdownMenuItem onClick={() => handleEdit(teacher)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(teacher)}
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

      <TeacherDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        teacher={selectedTeacher || undefined}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить преподавателя?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить преподавателя &quot;{teacherToDelete && getFullName(teacherToDelete)}&quot;?
              {teacherToDelete?._count &&
                (teacherToDelete._count.groups > 0 ||
                  teacherToDelete._count.schedules > 0) && (
                  <span className="text-destructive font-medium block mt-2">
                    Внимание: преподаватель назначен на группы или расписание!
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
