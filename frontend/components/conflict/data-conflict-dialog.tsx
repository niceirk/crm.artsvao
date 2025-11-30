'use client';

import { useConflictStore } from '@/lib/stores/conflict-store';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * Названия сущностей для отображения пользователю
 */
const ENTITY_NAMES: Record<string, string> = {
  subscription: 'Абонемент',
  attendance: 'Посещение',
  invoice: 'Счёт',
  payment: 'Платёж',
  client: 'Клиент',
  schedule: 'Занятие',
  group: 'Группа',
  medicalCertificate: 'Справка',
};

/**
 * Диалог для отображения конфликта оптимистичной блокировки.
 * Показывается когда данные были изменены другим пользователем (409 Conflict).
 */
export function DataConflictDialog() {
  const { conflict, isOpen, clearConflict } = useConflictStore();
  const queryClient = useQueryClient();

  const handleReload = () => {
    if (conflict) {
      // Инвалидируем кэш для изменённой сущности
      queryClient.invalidateQueries({ queryKey: [conflict.entity] });
      queryClient.invalidateQueries({ queryKey: [conflict.entity, conflict.entityId] });
    }
    clearConflict();
  };

  const entityName = conflict ? ENTITY_NAMES[conflict.entity] || conflict.entity : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && clearConflict()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Данные изменены
          </DialogTitle>
          <DialogDescription>
            {entityName} был изменён другим пользователем. Загрузите актуальную версию данных.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={clearConflict}>
            Закрыть
          </Button>
          <Button onClick={handleReload}>
            Загрузить актуальные данные
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
