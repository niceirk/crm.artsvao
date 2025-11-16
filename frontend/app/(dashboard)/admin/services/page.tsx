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
import { useServices, useDeleteService } from '@/hooks/use-services';
import { ServiceDialog } from './service-dialog';
import type { Service } from '@/lib/types/services';
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

const serviceTypeLabels = {
  SUBSCRIPTION: 'Абонемент',
  RENTAL: 'Аренда',
  SINGLE_SESSION: 'Разовое',
  INDIVIDUAL_LESSON: 'Инд. урок',
  OTHER: 'Прочее',
};

const unitLabels = {
  MONTH: 'мес',
  HOUR: 'час',
  SESSION: 'занятие',
  DAY: 'день',
  PIECE: 'шт',
};

export default function ServicesPage() {
  const { data: servicesResponse, isLoading } = useServices();
  const deleteMutation = useDeleteService();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const services = servicesResponse?.data || [];

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
          <h2 className="text-3xl font-bold tracking-tight">Номенклатура услуг</h2>
          <p className="text-muted-foreground">
            Управление услугами и расчет НДС
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить услугу
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список услуг</CardTitle>
          <CardDescription>Всего услуг: {services?.length || 0}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Загрузка...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">НДС</TableHead>
                  <TableHead className="text-right">С НДС</TableHead>
                  <TableHead>Ед.</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services?.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {service.name}
                    </TableCell>
                    <TableCell>{service.category?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {serviceTypeLabels[service.serviceType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(service.basePrice).toFixed(2)} ₽
                    </TableCell>
                    <TableCell className="text-right">{Number(service.vatRate)}%</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(service.priceWithVat).toFixed(2)} ₽
                    </TableCell>
                    <TableCell>{unitLabels[service.unitOfMeasure]}</TableCell>
                    <TableCell>
                      {service.isActive ? (
                        <Badge variant="default">Активна</Badge>
                      ) : (
                        <Badge variant="secondary">Неактивна</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingService(service)}
                      >
                        Изменить
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(service.id)}
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

      <ServiceDialog
        open={isCreateDialogOpen || !!editingService}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingService(undefined);
          }
        }}
        service={editingService}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить услугу?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Услуга будет удалена навсегда.
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
