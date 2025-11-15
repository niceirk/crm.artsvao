'use client';

import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, Palette } from 'lucide-react';
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
import { Studio } from '@/lib/api/studios';
import { useDeleteStudio } from '@/hooks/use-studios';
import { StudioDialog } from './studio-dialog';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Активна',
  INACTIVE: 'Неактивна',
};

const typeLabels: Record<string, string> = {
  GROUP: 'Групповые',
  INDIVIDUAL: 'Индивидуальные',
  BOTH: 'Групповые и индивидуальные',
};

interface StudiosTableProps {
  studios: Studio[];
  isLoading: boolean;
}

export function StudiosTable({ studios, isLoading }: StudiosTableProps) {
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studioToDelete, setStudioToDelete] = useState<Studio | null>(null);

  const deleteStudio = useDeleteStudio();

  const handleEdit = (studio: Studio) => {
    setSelectedStudio(studio);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (studio: Studio) => {
    setStudioToDelete(studio);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (studioToDelete) {
      try {
        await deleteStudio.mutateAsync(studioToDelete.id);
        setIsDeleteDialogOpen(false);
        setStudioToDelete(null);
      } catch (error) {
        // Error is handled by the mutation's onError
        // Keep dialog open so user can see the error
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  if (studios.length === 0) {
    return (
      <div className="text-center py-8">
        <Palette className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold">Нет студий</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Начните с создания первой студии
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
              <TableHead>Категория</TableHead>
              <TableHead>Группы</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {studios.map((studio) => (
              <TableRow key={studio.id}>
                <TableCell className="font-medium">{studio.name}</TableCell>
                <TableCell>{typeLabels[studio.type]}</TableCell>
                <TableCell>{studio.category || '—'}</TableCell>
                <TableCell>
                  {studio._count ? studio._count.groups : 0}
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[studio.status]}>
                    {statusLabels[studio.status]}
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
                      <DropdownMenuItem onClick={() => handleEdit(studio)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(studio)}
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

      <StudioDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        studio={selectedStudio || undefined}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить студию?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить студию &quot;{studioToDelete?.name}&quot;?
              {studioToDelete?._count && studioToDelete._count.groups > 0 && (
                <span className="text-destructive font-medium block mt-2">
                  Внимание: у студии есть группы ({studioToDelete._count.groups})!
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
