'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDistance } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Mail,
  FileText,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
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
  TableFooter,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { InvoiceStatusBadge } from '@/components/ui/status-badge';
import { useInvoice, useUpdateInvoice } from '@/hooks/use-invoices';
import { useAuth } from '@/hooks/use-auth';
import { useBreadcrumbs } from '@/lib/contexts/breadcrumbs-context';
import type { InvoiceStatus } from '@/lib/types/invoices';
import { InvoicePaymentsSection } from './components/invoice-payments-section';
import { InvoiceQRSection } from './components/invoice-qr-section';

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const invoiceId = params.id as string;
  const { setCustomTitle } = useBreadcrumbs();

  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const updateInvoice = useUpdateInvoice();

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Устанавливаем номер счета в хлебные крошки
  useEffect(() => {
    if (invoice?.invoiceNumber) {
      setCustomTitle(invoice.invoiceNumber);
    }
    return () => setCustomTitle(null);
  }, [invoice?.invoiceNumber, setCustomTitle]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice) return;

    setIsUpdatingStatus(true);
    try {
      await updateInvoice.mutateAsync({
        id: invoice.id,
        data: {
          version: invoice.version,
          status: newStatus,
          paidAt: newStatus === 'PAID' ? new Date().toISOString() : undefined,
        },
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Счет не найден
            </CardTitle>
            <CardDescription>
              Счет с указанным ID не существует или был удален
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/invoices')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться к списку
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';
  const canChangeStatus = isAdmin && invoice.status !== 'PAID';

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/invoices')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {invoice.invoiceNumber}
            </h2>
            <p className="text-muted-foreground">Детали счета</p>
          </div>
        </div>
        <InvoiceStatusBadge status={invoice.status} size="lg" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Клиент
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-lg">
                    {invoice.client.lastName} {invoice.client.firstName}
                  </p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{invoice.client.phone}</span>
                  </div>
                  {invoice.client.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{invoice.client.email}</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/clients/${invoice.clientId}`)}
                >
                  Перейти в CRM
                </Button>
              </div>
              {invoice.client.benefitCategory && (
                <div className="mt-3 pt-3 border-t">
                  <Badge variant="secondary">
                    {invoice.client.benefitCategory.name} (
                    {invoice.client.benefitCategory.discountPercent}%)
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Позиции счета
              </CardTitle>
              <CardDescription>
                Всего позиций: {invoice.items.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Услуга</TableHead>
                    <TableHead className="text-center">Кол-во</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                    <TableHead className="text-right">НДС</TableHead>
                    <TableHead className="text-right">Скидка</TableHead>
                    <TableHead className="text-right">Итого</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.serviceName}</span>
                          {item.serviceDescription && (
                            <span className="text-sm text-muted-foreground">
                              {item.serviceDescription}
                            </span>
                          )}
                          {item.room && (
                            <span className="text-xs text-muted-foreground">
                              Помещение: {item.room.name}
                            </span>
                          )}
                          {item.isPriceAdjusted && (
                            <Badge variant="outline" className="mt-1 w-fit text-xs">
                              Цена скорректирована
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.basePrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span>{formatCurrency(item.vatAmount)}</span>
                          <span className="text-xs text-muted-foreground">
                            ({item.vatRate}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.discountAmount > 0 ? (
                          <div className="flex flex-col items-end">
                            <span>{formatCurrency(item.discountAmount)}</span>
                            <span className="text-xs text-muted-foreground">
                              ({item.discountPercent}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-medium">
                      Подытог:
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.subtotal)}
                    </TableCell>
                  </TableRow>
                  {invoice.discountAmount > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-right font-medium">
                        Общая скидка:
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        -{formatCurrency(invoice.discountAmount)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-bold text-lg">
                      Итого к оплате:
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(invoice.totalAmount)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* Payments */}
          <InvoicePaymentsSection invoice={invoice} />

          {/* Audit Logs */}
          {invoice.auditLogs && invoice.auditLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  История изменений
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoice.auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-sm">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {log.user.lastName} {log.user.firstName}
                          </span>
                          <span className="text-muted-foreground">
                            {formatDistance(new Date(log.createdAt), new Date(), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          {log.action === 'CREATED' && 'Создан счет'}
                          {log.action === 'UPDATED' && `Обновлено: ${log.fieldName}`}
                          {log.action === 'STATUS_CHANGED' &&
                            `Статус изменен: ${log.oldValue} → ${log.newValue}`}
                          {log.action === 'PRICE_ADJUSTED' &&
                            `Цена скорректирована: ${log.fieldName}`}
                          {log.action === 'ITEM_ADDED' && 'Добавлена позиция'}
                          {log.action === 'ITEM_REMOVED' && 'Удалена позиция'}
                          {log.action === 'CANCELLED' && 'Счет отменен'}
                        </p>
                        {log.reason && (
                          <p className="text-xs text-muted-foreground italic">
                            Причина: {log.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Invoice Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Информация о счете</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Дата выставления</p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(invoice.issuedAt).toLocaleDateString('ru-RU')}
                </p>
              </div>

              {invoice.dueDate && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Срок оплаты</p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(invoice.dueDate).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              )}

              {invoice.paidAt && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Дата оплаты</p>
                  <p className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {new Date(invoice.paidAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Создан</p>
                <p className="text-sm">
                  {formatDistance(new Date(invoice.createdAt), new Date(), {
                    addSuffix: true,
                    locale: ru,
                  })}
                </p>
              </div>

              {invoice.creator && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Создал</p>
                  <p className="text-sm">
                    {invoice.creator.lastName} {invoice.creator.firstName}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Management */}
          {canChangeStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Управление статусом</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={invoice.status}
                  onValueChange={(value) => handleStatusChange(value as InvoiceStatus)}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNPAID">Не оплачен</SelectItem>
                    <SelectItem value="PAID">Оплачен</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Частично оплачен</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Примечания</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Related Rental */}
          {invoice.rental && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Связанная аренда</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Клиент:</span>{' '}
                  {invoice.rental.clientName}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Тип:</span>{' '}
                  {invoice.rental.eventType}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Дата:</span>{' '}
                  {new Date(invoice.rental.date).toLocaleDateString('ru-RU')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => router.push(`/rentals/${invoice.rentalId}`)}
                >
                  Перейти к аренде
                </Button>
              </CardContent>
            </Card>
          )}

          {/* QR Code for Payment */}
          <InvoiceQRSection
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
          />
        </div>
      </div>
    </div>
  );
}
