'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
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
  useBenefitCategories,
  useDeleteBenefitCategory,
} from '@/hooks/use-benefit-categories';
import { BenefitCategoryDialog } from './benefit-category-dialog';
import type { BenefitCategory } from '@/lib/types/benefit-categories';
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

export default function BenefitCategoriesPage() {
  const { data: categories, isLoading } = useBenefitCategories();
  const deleteMutation = useDeleteBenefitCategory();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BenefitCategory | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Льготные категории</h2>
          <p className="text-muted-foreground">
            Управление скидками и льготами для клиентов
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить категорию
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список льготных категорий</CardTitle>
          <CardDescription>Всего категорий: {categories?.length || 0}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Загрузка...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Скидка</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Требует документ</TableHead>
                  <TableHead>Клиентов</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories?.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>{category.discountPercent}%</TableCell>
                    <TableCell className="max-w-md truncate">
                      {category.description || '—'}
                    </TableCell>
                    <TableCell>
                      {category.requiresDocument ? (
                        <Badge variant="secondary">Да</Badge>
                      ) : (
                        <span className="text-muted-foreground">Нет</span>
                      )}
                    </TableCell>
                    <TableCell>{category._count?.clients || 0}</TableCell>
                    <TableCell>
                      {category.isActive ? (
                        <Badge variant="default">Активна</Badge>
                      ) : (
                        <Badge variant="secondary">Неактивна</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCategory(category)}
                      >
                        Изменить
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(category.id)}
                      >
                        Удалить
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <BenefitCategoryDialog
        open={isCreateDialogOpen || !!editingCategory}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingCategory(undefined);
          }
        }}
        category={editingCategory}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить льготную категорию?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Категория будет удалена навсегда.
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
