'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  useSubscriptionTypes,
  useDeleteSubscriptionType,
} from '@/hooks/use-subscription-types';
import { SubscriptionTypeDialog } from './subscription-type-dialog';
import type { SubscriptionType } from '@/lib/types/subscriptions';
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

export default function SubscriptionTypesPage() {
  const { data: response, isLoading } = useSubscriptionTypes({
    excludeTypes: ['VISIT_PACK'],
  });
  const deleteMutation = useDeleteSubscriptionType();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<SubscriptionType | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const types = response?.data || [];

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const getTypeLabel = (type: string) => {
    return type === 'UNLIMITED' ? 'Безлимитный' : 'Разовые посещения';
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Типы абонементов</h2>
          <p className="text-muted-foreground">
            Управление типами абонементов для групп
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить тип
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список типов абонементов</CardTitle>
          <CardDescription>Всего типов: {types.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Загрузка...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Группа</TableHead>
                  <TableHead>Студия</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>За занятие</TableHead>
                  <TableHead>Абонементов</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{type.group.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {type.group.studio.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.type === 'UNLIMITED' ? 'default' : 'secondary'}>
                        {getTypeLabel(type.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{type.price.toLocaleString('ru-RU')} ₽</TableCell>
                    <TableCell>
                      {type.pricePerLesson
                        ? `${type.pricePerLesson.toLocaleString('ru-RU')} ₽`
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{type._count?.subscriptions || 0}</TableCell>
                    <TableCell>
                      {type.isActive ? (
                        <Badge variant="default">Активен</Badge>
                      ) : (
                        <Badge variant="secondary">Неактивен</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingType(type)}
                        title="Изменить"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(type.id)}
                        disabled={(type._count?.subscriptions || 0) > 0}
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SubscriptionTypeDialog
        open={isCreateDialogOpen || !!editingType}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingType(undefined);
          }
        }}
        subscriptionType={editingType}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тип абонемента?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Тип абонемента будет удален навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
