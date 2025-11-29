'use client';

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, User, Users2, Receipt, DollarSign, Info, CheckCircle, XCircle, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AttendanceStatus } from '@/lib/types/attendance';
import { useSubscription } from '@/hooks/use-subscriptions';
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

const statusVariants: Record<string, 'success' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'success',
  EXPIRED: 'secondary',
  FROZEN: 'outline',
  CANCELLED: 'destructive',
};

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'Присутствовал',
  ABSENT: 'Пропустил',
  EXCUSED: 'Уважительно',
};

const attendanceStatusVariants: Record<AttendanceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PRESENT: 'default',
  ABSENT: 'destructive',
  EXCUSED: 'secondary',
};

const attendanceStatusIcons: Record<AttendanceStatus, JSX.Element> = {
  PRESENT: <Check className="h-4 w-4 text-emerald-500" />,
  ABSENT: <X className="h-4 w-4 text-destructive" />,
  EXCUSED: <AlertCircle className="h-4 w-4 text-yellow-600" />,
};

export function SubscriptionDetailsSheet({
  subscription: initialSubscription,
  open,
  onOpenChange,
}: SubscriptionDetailsSheetProps) {
  const { data: detailedSubscription } = useSubscription(initialSubscription.id);
  const subscription = detailedSubscription ?? initialSubscription;
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
          <div>
            <SheetTitle>{subscription.subscriptionType.name}</SheetTitle>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">
                {subscription.subscriptionType.type === 'UNLIMITED'
                  ? 'Безлимитный'
                  : 'Разовые посещения'}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariants[subscription.status]} className="text-sm w-auto">
                  {statusLabels[subscription.status]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  до {format(new Date(subscription.endDate), 'dd MMM yyyy', { locale: ru })}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">

          <div className="flex items-center gap-2 text-sm font-medium">
            <User className="h-5 w-5" />
            <div className="flex flex-wrap gap-2 items-center">
              <span className="font-medium">
                {subscription.client.lastName} {subscription.client.firstName}
              </span>
              <span className="text-sm text-muted-foreground">
                {subscription.client.phone}
              </span>
              {subscription.client.email && (
                <span className="text-sm text-muted-foreground">
                  {subscription.client.email}
                </span>
              )}
              {subscription.client.benefitCategory && (
                <Badge variant="outline">
                  Льгота: {subscription.client.benefitCategory.name} (
                  -{subscription.client.benefitCategory.discountPercent}%)
                </Badge>
              )}
            </div>
          </div>

          {/* История посещений */}
          {subscription.attendances && subscription.attendances.length > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  История посещений
                </div>
                <div className="ml-6 space-y-3">
                  {subscription.attendances.map((attendance) => {
                    const attendanceDate = attendance.markedAt
                      ? new Date(attendance.markedAt)
                      : new Date(attendance.schedule.date);
                    const timeString = attendance.schedule.startTime
                      ? new Date(attendance.schedule.startTime).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';
                    return (
                      <div key={attendance.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
                        <div className="space-y-1">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-3">
                              {attendanceStatusIcons[attendance.status]}
                              <span className="text-sm font-medium">
                                {format(attendanceDate, 'dd MMM yyyy', { locale: ru })}
                              </span>
                              {timeString && (
                                <span className="text-xs text-muted-foreground">
                                  {timeString}
                                </span>
                              )}
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                {attendance.subscriptionDeducted ? (
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                                <span>
                                  {attendance.subscriptionDeducted ? 'Списано' : 'Не списано'}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xs text-muted-foreground">
                                {attendance.schedule.group.name}
                              </span>
                              {attendance.markedByUser && (
                                <span className="text-xs text-muted-foreground">
                                  {attendance.markedByUser.firstName} {attendance.markedByUser.lastName}
                                </span>
                              )}
                            </div>
                            {attendance.notes && (
                              <p className="text-xs text-muted-foreground">
                                Примечание: {attendance.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Группа */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users2 className="h-4 w-4" />
              Группа
            </div>
            <div className="ml-6 space-y-2">
              <div>
                <p className="font-medium">{subscription.group.name}</p>
                <p className="text-sm text-muted-foreground">
                  {subscription.group.studio.name}
                </p>
              </div>
            </div>
          </div>

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
                {subscription.purchasedMonths > 1 && (
                  <span className="text-sm text-muted-foreground">
                    Куплено месяцев: {subscription.purchasedMonths}
                  </span>
                )}
              </div>
          </div>

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
              {subscription.pricePerLesson && (
                <div className="flex justify-between pt-2 mt-2 border-t border-dashed">
                  <span className="text-sm text-muted-foreground">Цена за занятие:</span>
                  <span className="text-sm font-medium text-primary">
                    {formatCurrency(subscription.pricePerLesson)}
                  </span>
                </div>
              )}
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
