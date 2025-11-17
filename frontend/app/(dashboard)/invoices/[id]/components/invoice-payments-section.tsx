'use client';

import { useState } from 'react';
import { formatDistance } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, CreditCard } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useInvoicePayments, useCreatePayment } from '@/hooks/use-payments';
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  PaymentType,
} from '@/lib/types/payments';
import type { Invoice } from '@/lib/types/invoices';

interface InvoicePaymentsSectionProps {
  invoice: Invoice;
}

export function InvoicePaymentsSection({ invoice }: InvoicePaymentsSectionProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const { data: paymentsResponse } = useInvoicePayments(invoice.id);
  const createPayment = useCreatePayment();

  const payments = paymentsResponse?.data || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };

  const totalPaid = payments
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const unpaidAmount = Number(invoice.totalAmount) - totalPaid;

  const handleCreatePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > unpaidAmount) {
      return;
    }

    await createPayment.mutateAsync({
      clientId: invoice.clientId,
      invoiceId: invoice.id,
      amount,
      paymentMethod,
      paymentType: invoice.subscriptionId ? 'SUBSCRIPTION' : 'SINGLE_VISIT',
    });

    setIsCreateDialogOpen(false);
    setPaymentAmount('');
    setPaymentMethod('CASH');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Платежи</CardTitle>
              <CardDescription>
                Оплачено: {formatCurrency(totalPaid)} из {formatCurrency(Number(invoice.totalAmount))}
              </CardDescription>
            </div>
            {unpaidAmount > 0 && (
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Добавить платеж
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {unpaidAmount > 0 && (
            <div className="mb-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Остаток к оплате:</span>
                <span className="text-lg font-bold">{formatCurrency(unpaidAmount)}</span>
              </div>
            </div>
          )}

          {payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Метод</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistance(new Date(payment.createdAt), new Date(), {
                        addSuffix: true,
                        locale: ru,
                      })}
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
                      <Badge variant={payment.status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {PAYMENT_STATUS_LABELS[payment.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Платежей по этому счету пока нет
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить платеж</DialogTitle>
            <DialogDescription>
              Максимальная сумма: {formatCurrency(unpaidAmount)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Сумма платежа</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                max={unpaidAmount}
              />
              <p className="text-xs text-muted-foreground">
                Остаток к оплате: {formatCurrency(unpaidAmount)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Метод оплаты</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreatePayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) > unpaidAmount || createPayment.isPending}
                className="flex-1"
              >
                {createPayment.isPending ? 'Создание...' : 'Создать платеж'}
              </Button>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
