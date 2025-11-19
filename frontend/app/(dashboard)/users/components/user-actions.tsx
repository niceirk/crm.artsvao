'use client';

import { useState } from 'react';
import { MoreHorizontal, Ban, CheckCircle, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { User } from '@/lib/types/auth';
import { useUpdateUserStatus, useDeleteUser } from '@/hooks/use-users';

interface UserActionsProps {
  user: User;
}

export function UserActions({ user }: UserActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const updateStatus = useUpdateUserStatus();
  const deleteUser = useDeleteUser();

  const handleToggleStatus = async () => {
    const newStatus = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    await updateStatus.mutateAsync({
      userId: user.id,
      data: { status: newStatus },
    });
  };

  const handleDelete = async () => {
    await deleteUser.mutateAsync(user.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Открыть меню</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleToggleStatus}>
            {user.status === 'ACTIVE' ? (
              <>
                <Ban className="mr-2 h-4 w-4" />
                Заблокировать
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Активировать
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы действительно хотите удалить пользователя{' '}
              <span className="font-semibold">
                {user.firstName} {user.lastName}
              </span>
              ? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
