'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { History, CreditCard, CalendarCheck, Receipt, AlertCircle, FileStack, ExternalLink, Plus } from 'lucide-react';
import { useClientInvoices } from '@/hooks/use-invoices';
import { useClientSubscriptions } from '@/hooks/use-subscriptions';
import { SellSubscriptionDialog } from '@/app/(dashboard)/subscriptions/components/sell-subscription-dialog';
import type { Client } from '@/lib/types/clients';
import type { InvoiceStatus } from '@/lib/types/invoices';
import type { SubscriptionStatus } from '@/lib/types/subscriptions';

interface ClientHistoryCardProps {
  client: Client;
}

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

const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Активен',
  EXPIRED: 'Истёк',
  FROZEN: 'Заморожен',
  CANCELLED: 'Отменён',
};

const subscriptionStatusVariants: Record<SubscriptionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  EXPIRED: 'secondary',
  FROZEN: 'outline',
  CANCELLED: 'destructive',
};

export function ClientHistoryCard({ client }: ClientHistoryCardProps) {
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);

  // Получаем счета и абонементы клиента
  const { data: invoices, isLoading: isLoadingInvoices } = useClientInvoices(client.id);
  const { data: subscriptionsResponse, isLoading: isLoadingSubscriptions } = useClientSubscriptions(client.id);

  const subscriptions = subscriptionsResponse?.data || [];

  // TODO: Получать данные из API когда модули будут готовы
  const attendance: any[] = [];
  const payments: any[] = [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-8 space-y-3">
      <div className="flex justify-center">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Данные появятся здесь после реализации соответствующих модулей
        </p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          История активности
        </CardTitle>
        <CardDescription>
          Абонементы, посещения, счета и платежи клиента
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileStack className="h-4 w-4" />
              Счета
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Абонементы
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Посещения
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Платежи
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-4">
            {isLoadingInvoices ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !invoices || invoices.length === 0 ? (
              <EmptyState message="Нет счетов" />
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                            <FileStack className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-mono font-medium">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(invoice.issuedAt).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {formatCurrency(invoice.totalAmount)}
                          </p>
                          <Badge variant={statusVariants[invoice.status]} className="mt-1">
                            {statusLabels[invoice.status]}
                          </Badge>
                        </div>
                      </div>
                      {invoice.notes && (
                        <p className="text-sm text-muted-foreground pl-13">
                          {invoice.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pl-13 text-xs text-muted-foreground">
                        <span>Позиций: {invoice.items.length}</span>
                        {invoice.rental && (
                          <>
                            <span>•</span>
                            <span>Аренда: {invoice.rental.eventType}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Link href={`/invoices/${invoice.id}`} className="ml-4">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-4">
            <div className="mb-4 flex justify-end">
              <Button onClick={() => setIsSellDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Продать абонемент
              </Button>
            </div>
            {isLoadingSubscriptions ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : subscriptions.length === 0 ? (
              <EmptyState message="Нет абонементов" />
            ) : (
              <div className="space-y-3">
                {subscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{subscription.subscriptionType.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {subscription.group.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {formatCurrency(subscription.paidPrice)}
                          </p>
                          <Badge variant={subscriptionStatusVariants[subscription.status]} className="mt-1">
                            {subscriptionStatusLabels[subscription.status]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pl-13 text-sm text-muted-foreground">
                        <span>
                          {format(new Date(subscription.startDate), 'dd MMM', { locale: ru })} - {format(new Date(subscription.endDate), 'dd MMM yyyy', { locale: ru })}
                        </span>
                        {subscription.remainingVisits !== null && subscription.remainingVisits !== undefined && (
                          <>
                            <span>•</span>
                            <span>Осталось: {subscription.remainingVisits} пос.</span>
                          </>
                        )}
                        {subscription.discountAmount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-destructive">Скидка: {formatCurrency(subscription.discountAmount)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="attendance" className="mt-4">
            {attendance.length === 0 ? (
              <EmptyState message="Нет записей о посещениях" />
            ) : (
              <div className="space-y-3">
                {attendance.map((att: any) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    {/* TODO: Компонент посещения */}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            {payments.length === 0 ? (
              <EmptyState message="Нет платежей" />
            ) : (
              <div className="space-y-3">
                {payments.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    {/* TODO: Компонент платежа */}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <SellSubscriptionDialog
        open={isSellDialogOpen}
        onOpenChange={setIsSellDialogOpen}
        preselectedClientId={client.id}
      />
    </Card>
  );
}
