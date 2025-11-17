'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, Eye } from 'lucide-react';
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
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { SellSubscriptionDialog } from './components/sell-subscription-dialog';
import { SubscriptionDetailsSheet } from './components/subscription-details-sheet';
import type { SubscriptionStatus, Subscription } from '@/lib/types/subscriptions';

const statusLabels: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Активен',
  EXPIRED: 'Истёк',
  FROZEN: 'Заморожен',
  CANCELLED: 'Отменён',
};

const statusVariants: Record<SubscriptionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  EXPIRED: 'secondary',
  FROZEN: 'outline',
  CANCELLED: 'destructive',
};

export default function SubscriptionsPage() {
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  const { data: subscriptionsResponse, isLoading } = useSubscriptions(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );

  const subscriptions = subscriptionsResponse?.data;
  const meta = subscriptionsResponse?.meta;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };

  const handleViewDetails = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Абонементы</h2>
          <p className="text-muted-foreground">
            Управление абонементами клиентов
          </p>
        </div>
        <Button onClick={() => setIsSellDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Продать абонемент
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Список абонементов</CardTitle>
              <CardDescription>
                Всего абонементов: {meta?.total || 0}
              </CardDescription>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as SubscriptionStatus | 'all')}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Фильтр по статусу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="ACTIVE">Активен</SelectItem>
                <SelectItem value="EXPIRED">Истёк</SelectItem>
                <SelectItem value="FROZEN">Заморожен</SelectItem>
                <SelectItem value="CANCELLED">Отменён</SelectItem>
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
                  <TableHead>Клиент</TableHead>
                  <TableHead>Группа</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Период</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-center">Посещений</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions?.map((subscription) => (
                  <TableRow
                    key={subscription.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(subscription)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {subscription.client.lastName} {subscription.client.firstName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {subscription.client.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{subscription.group.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {subscription.group.studio.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={subscription.subscriptionType.type === 'UNLIMITED' ? 'default' : 'secondary'}>
                        {subscription.subscriptionType.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>
                          {format(new Date(subscription.startDate), 'dd MMM', { locale: ru })} - {format(new Date(subscription.endDate), 'dd MMM yyyy', { locale: ru })}
                        </span>
                        {subscription.purchasedMonths > 1 && (
                          <span className="text-muted-foreground">
                            {subscription.purchasedMonths} мес.
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-medium">{formatCurrency(subscription.paidPrice)}</span>
                        {subscription.discountAmount > 0 && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatCurrency(subscription.originalPrice)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {subscription.remainingVisits !== null && subscription.remainingVisits !== undefined ? (
                        <Badge variant="outline">{subscription.remainingVisits}</Badge>
                      ) : (
                        <span className="text-muted-foreground">∞</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[subscription.status]}>
                        {statusLabels[subscription.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(subscription);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SellSubscriptionDialog
        open={isSellDialogOpen}
        onOpenChange={setIsSellDialogOpen}
      />

      {selectedSubscription && (
        <SubscriptionDetailsSheet
          subscription={selectedSubscription}
          open={!!selectedSubscription}
          onOpenChange={(open) => !open && setSelectedSubscription(null)}
        />
      )}
    </div>
  );
}
