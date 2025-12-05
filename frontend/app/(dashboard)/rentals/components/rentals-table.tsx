'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MoreHorizontal, Check, RefreshCw, X, Trash2, Eye, Clock, Monitor, Building } from 'lucide-react';
import {
  RentalApplication,
  RentalType,
  RENTAL_TYPE_LABELS,
  RENTAL_STATUS_LABELS,
  RENTAL_STATUS_COLORS,
} from '@/lib/types/rental-applications';
import {
  useConfirmRentalApplication,
  useCancelRentalApplication,
  useDeleteRentalApplication,
} from '@/hooks/use-rental-applications';
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

interface RentalsTableProps {
  applications: RentalApplication[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}

function getRentalTypeIcon(type: RentalType) {
  if (type === 'HOURLY') {
    return <Clock className="h-4 w-4" />;
  }
  if (type.startsWith('WORKSPACE_')) {
    return <Monitor className="h-4 w-4" />;
  }
  return <Building className="h-4 w-4" />;
}

export function RentalsTable({ applications, isLoading, onEdit }: RentalsTableProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const confirmMutation = useConfirmRentalApplication();

  const handleRowClick = (id: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      window.open(`/rentals/${id}`, '_blank');
      return;
    }

    router.push(`/rentals/${id}`);
  };
  const cancelMutation = useCancelRentalApplication();
  const deleteMutation = useDeleteRentalApplication();

  const getDeleteWarning = (app: RentalApplication) => {
    const effects: string[] = [];

    if (app._count?.rentals || app.rentals?.length) {
      effects.push('бронирования в календаре будут удалены');
    }
    if (app._count?.invoices || app.invoices?.length) {
      effects.push('неоплаченные счета будут аннулированы');
    }

    if (effects.length === 0) {
      return 'Это действие нельзя отменить. Заявка будет удалена безвозвратно.';
    }
    return `Это действие нельзя отменить. При удалении: ${effects.join(', ')}.`;
  };

  const formatPeriod = (app: RentalApplication) => {
    const start = format(new Date(app.startDate), 'dd.MM.yyyy', { locale: ru });
    if (app.endDate) {
      const end = format(new Date(app.endDate), 'dd.MM.yyyy', { locale: ru });
      if (start !== end) return `${start} - ${end}`;
    }
    if (app.startTime && app.endTime) {
      return `${start} (${app.startTime.slice(11, 16)}-${app.endTime.slice(11, 16)})`;
    }
    return start;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Заявки не найдены
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Номер</TableHead>
              <TableHead>Клиент</TableHead>
              <TableHead className="w-[50px]">Тип</TableHead>
              <TableHead>Помещение</TableHead>
              <TableHead>Период</TableHead>
              <TableHead>Слоты</TableHead>
              <TableHead>Итого</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <TableRow
                key={app.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={(e) => handleRowClick(app.id, e)}
              >
                <TableCell className="font-medium">{app.applicationNumber}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {app.client.lastName} {app.client.firstName}
                    </div>
                    <div className="text-sm text-muted-foreground">{app.client.phone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        {getRentalTypeIcon(app.rentalType)}
                      </TooltipTrigger>
                      <TooltipContent>
                        {RENTAL_TYPE_LABELS[app.rentalType]}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  {app.room ? (
                    <span>{app.room.name}</span>
                  ) : app.workspaces.length > 0 ? (
                    <span>{app.workspaces.map(w => w.workspace.name).join(', ')}</span>
                  ) : '-'}
                </TableCell>
                <TableCell>{formatPeriod(app)}</TableCell>
                <TableCell>{app._count?.rentals || app.rentals?.length || 0}</TableCell>
                <TableCell className="font-medium">
                  {Number(app.totalPrice).toLocaleString('ru-RU')} ₽
                </TableCell>
                <TableCell>
                  <Badge className={RENTAL_STATUS_COLORS[app.status]}>
                    {RENTAL_STATUS_LABELS[app.status]}
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
                      <DropdownMenuItem onClick={() => onEdit(app.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Просмотр
                      </DropdownMenuItem>

                      {app.status === 'DRAFT' && (
                        <DropdownMenuItem
                          onClick={() => confirmMutation.mutate(app.id)}
                          disabled={confirmMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Подтвердить
                        </DropdownMenuItem>
                      )}

                      {['CONFIRMED', 'ACTIVE'].includes(app.status) && (
                        <DropdownMenuItem onClick={() => {/* TODO: продление */}}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Продлить
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      {!['CANCELLED', 'COMPLETED'].includes(app.status) && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setCancelId(app.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Отменить
                        </DropdownMenuItem>
                      )}

                      {app.status !== 'CANCELLED' && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteId(app.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заявку?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteId && getDeleteWarning(applications.find((a) => a.id === deleteId)!)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог подтверждения отмены */}
      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить заявку?</AlertDialogTitle>
            <AlertDialogDescription>
              Связанные бронирования в календаре будут отменены. Неоплаченные счета будут аннулированы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Назад</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (cancelId) {
                  cancelMutation.mutate({ id: cancelId });
                  setCancelId(null);
                }
              }}
            >
              Отменить заявку
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
