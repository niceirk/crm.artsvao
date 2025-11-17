'use client';

import { useState } from 'react';
import { formatDistance } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CreditCard, Plus } from 'lucide-react';
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
import { usePayments } from '@/hooks/use-payments';
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  type PaymentStatus,
} from '@/lib/types/payments';

const statusVariants: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  COMPLETED: 'default',
  FAILED: 'destructive',
  REFUNDED: 'outline',
};

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');

  const { data: paymentsResponse, isLoading } = usePayments(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );

  const payments = paymentsResponse?.data;
  const meta = paymentsResponse?.meta;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };

  const formatDate = (date: string) => {
    return formatDistance(new Date(date), new Date(), {
      addSuffix: true,
      locale: ru,
    });
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Платежи</h2>
          <p className="text-muted-foreground">
            Управление платежами клиентов
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Список платежей</CardTitle>
              <CardDescription>
                Всего платежей: {meta?.total || 0}
              </CardDescription>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as PaymentStatus | 'all')}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Фильтр по статусу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Загрузка...
            </div>
          ) : payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Счет</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Метод</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(payment.createdAt)}
                    </TableCell>
                    <TableCell>
                      {payment.client ? (
                        <div>
                          <div className="font-medium">
                            {payment.client.firstName} {payment.client.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payment.client.phone}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {payment.invoice ? (
                        <div>
                          <div className="font-medium">
                            {payment.invoice.invoiceNumber}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(Number(payment.invoice.totalAmount))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(Number(payment.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {PAYMENT_TYPE_LABELS[payment.paymentType]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[payment.status]}>
                        {PAYMENT_STATUS_LABELS[payment.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Платежей нет</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Платежи появятся здесь после их создания через счета
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
