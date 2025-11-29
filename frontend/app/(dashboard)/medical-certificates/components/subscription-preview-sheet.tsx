'use client';

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Calendar,
  User,
  Users2,
  DollarSign,
  Info,
  Loader2,
  CreditCard,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSubscription } from '@/hooks/use-subscriptions';

interface SubscriptionPreviewSheetProps {
  subscriptionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Активен',
  EXPIRED: 'Истёк',
  FROZEN: 'Заморожен',
  CANCELLED: 'Отменён',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  EXPIRED: 'secondary',
  FROZEN: 'outline',
  CANCELLED: 'destructive',
};

const typeLabels: Record<string, string> = {
  UNLIMITED: 'Безлимитный',
  SINGLE_VISIT: 'Разовое посещение',
  VISIT_PACK: 'Пакет посещений',
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(Number(amount));
};

export function SubscriptionPreviewSheet({
  subscriptionId,
  open,
  onOpenChange,
}: SubscriptionPreviewSheetProps) {
  const { data: subscription, isLoading } = useSubscription(subscriptionId || '');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[450px] sm:max-w-[450px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : subscription ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {subscription.subscriptionType?.name || 'Абонемент'}
              </SheetTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={statusVariants[subscription.status] || 'outline'}>
                  {statusLabels[subscription.status] || subscription.status}
                </Badge>
                <Badge variant="outline">
                  {typeLabels[subscription.subscriptionType?.type] || subscription.subscriptionType?.type}
                </Badge>
              </div>
            </SheetHeader>

            <div className="space-y-5 mt-6">
              {/* Клиент */}
              {subscription.client && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4" />
                    Клиент
                  </div>
                  <div className="ml-6">
                    <p className="font-medium">
                      {subscription.client.lastName} {subscription.client.firstName}
                    </p>
                    {subscription.client.phone && (
                      <p className="text-sm text-muted-foreground">{subscription.client.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Группа */}
              {subscription.group && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users2 className="h-4 w-4" />
                    Группа
                  </div>
                  <div className="ml-6">
                    <p className="font-medium">{subscription.group.name}</p>
                    {subscription.group.studio && (
                      <p className="text-sm text-muted-foreground">{subscription.group.studio.name}</p>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Период действия */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Период действия
                </div>
                <div className="ml-6 space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">с </span>
                    {format(new Date(subscription.startDate), 'dd MMMM yyyy', { locale: ru })}
                    <span className="text-muted-foreground"> по </span>
                    {format(new Date(subscription.endDate), 'dd MMMM yyyy', { locale: ru })}
                  </p>
                  {subscription.purchasedMonths && subscription.purchasedMonths > 1 && (
                    <p className="text-sm text-muted-foreground">
                      Куплено месяцев: {subscription.purchasedMonths}
                    </p>
                  )}
                </div>
              </div>

              {/* Посещения */}
              {subscription.remainingVisits !== null && subscription.remainingVisits !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Info className="h-4 w-4" />
                    Посещения
                  </div>
                  <div className="ml-6">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Осталось:</span>
                      <Badge variant="outline" className="font-mono">
                        {subscription.remainingVisits}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Стоимость */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4" />
                  Стоимость
                </div>
                <div className="ml-6 space-y-1">
                  {subscription.discountAmount && subscription.discountAmount > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Исходная цена:</span>
                        <span className="text-sm line-through text-muted-foreground">
                          {formatCurrency(subscription.originalPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Скидка:</span>
                        <span className="text-sm text-destructive">
                          -{formatCurrency(subscription.discountAmount)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-sm font-medium">Оплачено:</span>
                    <span className="text-base font-bold">
                      {formatCurrency(subscription.paidPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Дата покупки */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Дата покупки: {format(new Date(subscription.purchaseDate), 'dd MMM yyyy', { locale: ru })}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            Абонемент не найден
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
