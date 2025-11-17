'use client';

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, User, Users2, Receipt, DollarSign, Info } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Subscription } from '@/lib/types/subscriptions';

interface SubscriptionDetailsSheetProps {
  subscription: Subscription;
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

export function SubscriptionDetailsSheet({
  subscription,
  open,
  onOpenChange,
}: SubscriptionDetailsSheetProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Детали абонемента</SheetTitle>
          <SheetDescription>
            Информация об абонементе клиента
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Статус */}
          <div>
            <Badge variant={statusVariants[subscription.status]} className="text-sm">
              {statusLabels[subscription.status]}
            </Badge>
          </div>

          <Separator />

          {/* Клиент */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              Клиент
            </div>
            <div className="ml-6 space-y-1">
              <p className="font-medium">
                {subscription.client.lastName} {subscription.client.firstName}
              </p>
              <p className="text-sm text-muted-foreground">
                {subscription.client.phone}
              </p>
              {subscription.client.email && (
                <p className="text-sm text-muted-foreground">
                  {subscription.client.email}
                </p>
              )}
              {subscription.client.benefitCategory && (
                <Badge variant="outline" className="mt-1">
                  Льгота: {subscription.client.benefitCategory.name} (-{subscription.client.benefitCategory.discountPercent}%)
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Группа и тип */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users2 className="h-4 w-4" />
              Группа и тип абонемента
            </div>
            <div className="ml-6 space-y-2">
              <div>
                <p className="font-medium">{subscription.group.name}</p>
                <p className="text-sm text-muted-foreground">
                  {subscription.group.studio.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Тип абонемента:</p>
                <p className="font-medium">{subscription.subscriptionType.name}</p>
                <Badge variant={subscription.subscriptionType.type === 'UNLIMITED' ? 'default' : 'secondary'} className="mt-1">
                  {subscription.subscriptionType.type === 'UNLIMITED' ? 'Безлимитный' : 'Разовые посещения'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Период действия */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Период действия
            </div>
            <div className="ml-6 space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Начало:</span>
                <span className="text-sm font-medium">
                  {format(new Date(subscription.startDate), 'dd MMMM yyyy', { locale: ru })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Окончание:</span>
                <span className="text-sm font-medium">
                  {format(new Date(subscription.endDate), 'dd MMMM yyyy', { locale: ru })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Месяц:</span>
                <span className="text-sm font-medium">
                  {subscription.validMonth}
                </span>
              </div>
              {subscription.purchasedMonths > 1 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Куплено месяцев:</span>
                  <span className="text-sm font-medium">
                    {subscription.purchasedMonths}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Посещения */}
          {subscription.remainingVisits !== null && subscription.remainingVisits !== undefined && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="h-4 w-4" />
                  Посещения
                </div>
                <div className="ml-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Осталось посещений:</span>
                    <Badge variant="outline" className="font-mono">
                      {subscription.remainingVisits}
                    </Badge>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Стоимость */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4" />
              Стоимость
            </div>
            <div className="ml-6 space-y-1">
              {subscription.discountAmount > 0 && (
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

          <Separator />

          {/* Даты создания */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Receipt className="h-4 w-4" />
              Информация о покупке
            </div>
            <div className="ml-6 space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Дата покупки:</span>
                <span className="text-sm">
                  {format(new Date(subscription.purchaseDate), 'dd MMM yyyy, HH:mm', { locale: ru })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Создан:</span>
                <span className="text-sm">
                  {format(new Date(subscription.createdAt), 'dd MMM yyyy, HH:mm', { locale: ru })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
