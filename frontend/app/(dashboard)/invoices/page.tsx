'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistance } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Eye, FileText, Plus } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInvoices } from '@/hooks/use-invoices';
import { CreateInvoiceDialog } from './components/create-invoice-dialog';
import type { InvoiceStatus } from '@/lib/types/invoices';

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'Черновик',
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  PARTIALLY_PAID: 'Частично оплачен',
  OVERDUE: 'Просрочен',
  CANCELLED: 'Отменен',
};

const statusVariants: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  PENDING: 'secondary',
  PAID: 'default',
  PARTIALLY_PAID: 'secondary',
  OVERDUE: 'destructive',
  CANCELLED: 'outline',
};

export default function InvoicesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: invoicesResponse, isLoading } = useInvoices(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );

  const invoices = invoicesResponse?.data;
  const meta = invoicesResponse?.meta;

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Список счетов</CardTitle>
              <CardDescription>
                Всего счетов: {meta?.total || 0}
              </CardDescription>
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
                <SelectItem value="PENDING">Ожидает оплаты</SelectItem>
                <SelectItem value="PAID">Оплачен</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Частично оплачен</SelectItem>
                <SelectItem value="OVERDUE">Просрочен</SelectItem>
                <SelectItem value="CANCELLED">Отменен</SelectItem>
              </SelectContent>
            </Select>
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
                  <TableHead>Клиент</TableHead>
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
                    <TableCell className="font-mono font-medium">
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
                      <Badge variant={statusVariants[invoice.status]}>
                        {statusLabels[invoice.status]}
                      </Badge>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/invoices/${invoice.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Просмотр
                      </Button>
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
    </div>
  );
}
