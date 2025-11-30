'use client';

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
import { useCanDeleteSubscription, useDeleteSubscription } from '@/hooks/use-subscriptions';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteSubscriptionDialogProps {
  subscriptionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteSubscriptionDialog({
  subscriptionId,
  open,
  onOpenChange,
  onDeleted,
}: DeleteSubscriptionDialogProps) {
  const { data: canDeleteData, isLoading } = useCanDeleteSubscription(open ? subscriptionId : null);
  const deleteMutation = useDeleteSubscription();

  const handleDelete = async () => {
    if (!subscriptionId) return;

    try {
      await deleteMutation.mutateAsync(subscriptionId);
      onOpenChange(false);
      onDeleted?.();
    } catch {
      // Ошибка обрабатывается в хуке
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить абонемент?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Проверка возможности удаления...
                </div>
              ) : canDeleteData?.canDelete ? (
                <>
                  <p>Это действие нельзя отменить.</p>
                  {canDeleteData.attendanceCount > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-amber-800">
                        <p className="font-medium">Будет удалено записей на занятия: {canDeleteData.attendanceCount}</p>
                        <p className="text-sm">Связанные счета будут отменены.</p>
                      </div>
                    </div>
                  )}
                  {canDeleteData.attendanceCount === 0 && (
                    <p className="text-muted-foreground">Связанные счета будут отменены.</p>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-destructive">
                    <p className="font-medium">Удаление невозможно</p>
                    <p className="text-sm">{canDeleteData?.reason}</p>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading || !canDeleteData?.canDelete || deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Удаление...
              </>
            ) : (
              'Удалить'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
