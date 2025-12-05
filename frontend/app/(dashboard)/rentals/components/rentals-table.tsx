'use client';

import React, { useState, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { MoreHorizontal, RefreshCw, X, Trash2, Eye, Clock, Monitor, Building, FileText, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  RentalApplication,
  RentalType,
  RENTAL_TYPE_LABELS,
  RENTAL_STATUS_LABELS,
  RENTAL_STATUS_COLORS,
} from '@/lib/types/rental-applications';
import {
  useCancelRentalApplication,
  useDeleteRentalApplication,
  useCreateInvoice,
  useCreateInvoicesBatch,
  useMarkInvoicesPaidBatch,
  useMarkInvoicePaid,
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

// Статусы и цвета для счетов
const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING: 'Ожидает',
  PAID: 'Оплачен',
  PARTIALLY_PAID: 'Частично',
  OVERDUE: 'Просрочен',
  CANCELLED: 'Отменён',
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  PENDING: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  PAID: 'bg-green-100 text-green-800 hover:bg-green-200',
  PARTIALLY_PAID: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  OVERDUE: 'bg-red-100 text-red-800 hover:bg-red-200',
  CANCELLED: 'bg-gray-100 text-gray-500 hover:bg-gray-200',
};

type SortField = 'createdAt' | 'client' | 'applicationNumber' | 'slots';
type SortOrder = 'asc' | 'desc';

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchInvoiceConfirm, setShowBatchInvoiceConfirm] = useState(false);
  const [showBatchPaidConfirm, setShowBatchPaidConfirm] = useState(false);

  // Сортировка
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'client':
          cmp = `${a.client.lastName} ${a.client.firstName}`.localeCompare(
            `${b.client.lastName} ${b.client.firstName}`, 'ru'
          );
          break;
        case 'applicationNumber':
          cmp = a.applicationNumber.localeCompare(b.applicationNumber);
          break;
        case 'slots':
          cmp = (a._count?.rentals || 0) - (b._count?.rentals || 0);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [applications, sortField, sortOrder]);

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead>
      <Button
        variant="ghost"
        onClick={() => handleSort(field)}
        className="p-0 h-auto font-medium hover:bg-transparent"
      >
        {children}
        {sortField === field
          ? (sortOrder === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />)
          : <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />}
      </Button>
    </TableHead>
  );

  const createInvoiceMutation = useCreateInvoice();
  const createInvoicesBatchMutation = useCreateInvoicesBatch();
  const markInvoicesPaidBatchMutation = useMarkInvoicesPaidBatch();
  const markInvoicePaidMutation = useMarkInvoicePaid();

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedApplications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedApplications.map(a => a.id)));
    }
  };

  const handleBatchCreateInvoices = () => {
    createInvoicesBatchMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setSelectedIds(new Set());
        setShowBatchInvoiceConfirm(false);
      },
    });
  };

  const handleBatchMarkPaid = () => {
    markInvoicesPaidBatchMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setSelectedIds(new Set());
        setShowBatchPaidConfirm(false);
      },
    });
  };

  const getActiveInvoice = (app: RentalApplication) => {
    return app.invoices?.find(inv => inv.status !== 'CANCELLED');
  };

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

  if (sortedApplications.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Заявки не найдены
      </div>
    );
  }

  return (
    <>
      {/* Панель массовых действий */}
      {selectedIds.size > 0 && (
        <div className="mb-4 bg-muted/50 border rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Выбрано: {selectedIds.size}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBatchInvoiceConfirm(true)}
              disabled={createInvoicesBatchMutation.isPending}
            >
              <FileText className="h-4 w-4 mr-2" />
              Сформировать счета
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBatchPaidConfirm(true)}
              disabled={markInvoicesPaidBatchMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Отметить оплаченными
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-4 w-4 mr-2" />
              Отменить
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedIds.size === sortedApplications.length && sortedApplications.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <SortableHeader field="applicationNumber">Номер</SortableHeader>
              <SortableHeader field="createdAt">Создано</SortableHeader>
              <SortableHeader field="client">Клиент</SortableHeader>
              <TableHead className="w-[50px]">Тип</TableHead>
              <TableHead>Помещение</TableHead>
              <TableHead>Период</TableHead>
              <SortableHeader field="slots">Слоты</SortableHeader>
              <TableHead>Итого</TableHead>
              <TableHead>Счет</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedApplications.map((app) => {
              const activeInvoice = getActiveInvoice(app);
              return (
                <TableRow
                key={app.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={(e) => handleRowClick(app.id, e)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(app.id)}
                    onCheckedChange={() => toggleSelect(app.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{app.applicationNumber}</TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(app.createdAt), 'dd.MM.yyyy', { locale: ru })}
                </TableCell>
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
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {activeInvoice ? (
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`cursor-pointer ${INVOICE_STATUS_COLORS[activeInvoice.status]}`}
                        onClick={() => window.open(`/invoices/${activeInvoice.id}`, '_blank')}
                      >
                        {INVOICE_STATUS_LABELS[activeInvoice.status]}
                      </Badge>
                      {activeInvoice.status !== 'PAID' && activeInvoice.status !== 'CANCELLED' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => markInvoicePaidMutation.mutate(activeInvoice.id)}
                                disabled={markInvoicePaidMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Отметить оплаченным
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => onEdit(app.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Просмотр
                      </DropdownMenuItem>

                      {!activeInvoice && (
                        <DropdownMenuItem
                          onClick={() => createInvoiceMutation.mutate(app.id)}
                          disabled={createInvoiceMutation.isPending}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Сформировать счет
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
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заявку?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteId && getDeleteWarning(sortedApplications.find((a) => a.id === deleteId)!)}
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

      {/* Диалог подтверждения массового создания счетов */}
      <AlertDialog open={showBatchInvoiceConfirm} onOpenChange={setShowBatchInvoiceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сформировать счета?</AlertDialogTitle>
            <AlertDialogDescription>
              Будут сформированы счета для {selectedIds.size} заявок.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchCreateInvoices}
              disabled={createInvoicesBatchMutation.isPending}
            >
              {createInvoicesBatchMutation.isPending ? 'Формирование...' : 'Сформировать'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог подтверждения массовой оплаты */}
      <AlertDialog open={showBatchPaidConfirm} onOpenChange={setShowBatchPaidConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отметить счета оплаченными?</AlertDialogTitle>
            <AlertDialogDescription>
              Счета для {selectedIds.size} заявок будут отмечены как оплаченные.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchMarkPaid}
              disabled={markInvoicesPaidBatchMutation.isPending}
            >
              {markInvoicesPaidBatchMutation.isPending ? 'Обработка...' : 'Отметить оплаченными'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
