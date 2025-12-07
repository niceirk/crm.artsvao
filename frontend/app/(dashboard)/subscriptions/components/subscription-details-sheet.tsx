'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, User, Users2, Receipt, DollarSign, Info, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SubscriptionStatusBadge, AttendanceStatusBadge } from '@/components/ui/status-badge';
import { ATTENDANCE_STATUS_CONFIG } from '@/lib/constants/status';
import { useSubscription } from '@/hooks/use-subscriptions';
import type { Subscription } from '@/lib/types/subscriptions';
import { DeleteSubscriptionDialog } from './delete-subscription-dialog';

interface SubscriptionDetailsSheetProps {
  subscription: Subscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionDetailsSheet({
  subscription: initialSubscription,
  open,
  onOpenChange,
}: SubscriptionDetailsSheetProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
            <div className="flex items-center gap-3">
              <SheetTitle>{subscription.subscriptionType.name}</SheetTitle>
              {subscription.subscriptionNumber && (
                <span className="text-sm text-muted-foreground">
                  №{subscription.subscriptionNumber.toString().padStart(7, '0')}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {subscription.subscriptionType.type === 'UNLIMITED'
                    ? 'Безлимитный'
                    : 'Разовые посещения'}
                </span>
                {subscription.subscriptionType.type === 'UNLIMITED' && (
                  <span className="text-sm font-medium text-primary capitalize">
                    {format(parseISO(subscription.startDate), 'LLLL yyyy', { locale: ru })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <SubscriptionStatusBadge status={subscription.status} />
                <span className="text-sm text-muted-foreground">
                  до {format(parseISO(subscription.endDate), 'dd MMM yyyy', { locale: ru })}
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
                      ? parseISO(attendance.markedAt)
                      : parseISO(attendance.schedule.date);
                    const timeString = attendance.schedule.startTime
                      ? parseISO(attendance.schedule.startTime).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';
                    return (
                      <div key={attendance.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
                        <div className="space-y-1">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <AttendanceStatusBadge status={attendance.status} size="sm" />
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
                  {format(parseISO(subscription.startDate), 'dd MMMM yyyy', { locale: ru })}
                  <span className="text-muted-foreground"> по </span>
                  {format(parseISO(subscription.endDate), 'dd MMMM yyyy', { locale: ru })}
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
              {subscription.subscriptionType.pricePerLesson && (
                <div className="flex justify-between pt-2 mt-2 border-t border-dashed">
                  <span className="text-sm text-muted-foreground">Цена за занятие:</span>
                  <div className="flex flex-col items-end">
                    {subscription.client.benefitCategory?.discountPercent ? (
                      <>
                        <span className="text-sm font-medium text-primary">
                          {formatCurrency(
                            subscription.subscriptionType.pricePerLesson *
                              (1 - subscription.client.benefitCategory.discountPercent / 100)
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground line-through">
                          {formatCurrency(subscription.subscriptionType.pricePerLesson)}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-primary">
                        {formatCurrency(subscription.subscriptionType.pricePerLesson)}
                      </span>
                    )}
                  </div>
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
                  {format(parseISO(subscription.purchaseDate), 'dd MMM yyyy', { locale: ru })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Создан:</span>
                <span className="text-sm">
                  {format(parseISO(subscription.createdAt), 'dd MMM yyyy, HH:mm', { locale: ru })}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Действия */}
          <div className="pt-2">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить абонемент
            </Button>
          </div>
        </div>
      </SheetContent>

      <DeleteSubscriptionDialog
        subscriptionId={subscription.id}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => onOpenChange(false)}
      />
    </Sheet>
  );
}
