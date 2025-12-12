'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistance } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Eye, FileText, Plus, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Check } from 'lucide-react';
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
import { InvoiceStatusBadge } from '@/components/ui/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useInvoices, useDeleteInvoice, useMarkAsPaid } from '@/hooks/use-invoices';
import { useAuth } from '@/hooks/use-auth';
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
import { CreateInvoiceDialog } from './components/create-invoice-dialog';
import type { InvoiceStatus, InvoiceFilterDto } from '@/lib/types/invoices';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export default function InvoicesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [clientSearch, setClientSearch] = useState('');
  const [sortBy, setSortBy] = useState<InvoiceFilterDto['sortBy']>(undefined);
  const [sortOrder, setSortOrder] = useState<InvoiceFilterDto['sortOrder']>('desc');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<{ id: string; number: string } | null>(null);

  const debouncedClientSearch = useDebouncedValue(clientSearch, 300);

  const filter = useMemo<InvoiceFilterDto | undefined>(() => {
    const f: InvoiceFilterDto = {};
    if (statusFilter !== 'all') f.status = statusFilter;
    if (debouncedClientSearch) f.clientSearch = debouncedClientSearch;
    if (sortBy) {
      f.sortBy = sortBy;
      f.sortOrder = sortOrder;
    }
    return Object.keys(f).length > 0 ? f : undefined;
  }, [statusFilter, debouncedClientSearch, sortBy, sortOrder]);

  const { data: invoices, isLoading } = useInvoices(filter);
  const deleteInvoice = useDeleteInvoice();
  const markAsPaid = useMarkAsPaid();

  const handleSort = (column: InvoiceFilterDto['sortBy']) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: InvoiceFilterDto['sortBy']) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Только nikita@artsvao.ru может удалять счета
  const canDeleteInvoices = user?.email === 'nikita@artsvao.ru';

  const handleDeleteInvoice = () => {
    if (invoiceToDelete) {
      deleteInvoice.mutate(invoiceToDelete.id, {
        onSuccess: () => setInvoiceToDelete(null),
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Счета</h2>
          <p className="text-muted-foreground">
            Управление счетами и платежами
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Создать счет
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Список счетов</CardTitle>
                <CardDescription>
                  Всего счетов: {invoices?.length || 0}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по ФИО клиента..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-8 w-[250px]"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as InvoiceStatus | 'all')}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Фильтр по статусу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="UNPAID">Не оплачен</SelectItem>
                    <SelectItem value="PAID">Оплачен</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Частично оплачен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Загрузка...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер счета</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('clientName')}
                    >
                      Клиент
                      {getSortIcon('clientName')}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата выставления</TableHead>
                  <TableHead>Позиций</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices?.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                  >
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {invoice.client.lastName} {invoice.client.firstName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {invoice.client.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>
                          {new Date(invoice.issuedAt).toLocaleDateString('ru-RU')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatDistance(new Date(invoice.issuedAt), new Date(), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{invoice.items.length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {invoice.status !== 'PAID' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsPaid.mutate(invoice.id);
                            }}
                            disabled={markAsPaid.isPending}
                            title="Отметить как оплаченный"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/invoices/${invoice.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canDeleteInvoices && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInvoiceToDelete({ id: invoice.id, number: invoice.invoiceNumber });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {invoices?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Счета не найдены</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateInvoiceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить счет?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить счет {invoiceToDelete?.number}? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvoice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteInvoice.isPending ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
