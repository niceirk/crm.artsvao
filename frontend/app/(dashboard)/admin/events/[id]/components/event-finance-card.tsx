'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Event } from '@/lib/api/events';
import { DollarSign, Check, X } from 'lucide-react';

interface EventFinanceCardProps {
  event: Event;
}

export function EventFinanceCard({ event }: EventFinanceCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Финансовая информация
        </CardTitle>
        <CardDescription>Бюджет и финансовые параметры</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget */}
        {event.budget && (
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Бюджет</dt>
            <dd className="text-2xl font-bold mt-1">
              {formatCurrency(Number(event.budget))}
            </dd>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Is Paid */}
          <div>
            <dt className="text-sm font-medium text-muted-foreground mb-2">Тип</dt>
            <dd>
              <Badge variant={event.isPaid ? 'default' : 'outline'}>
                {event.isPaid ? 'Платное' : 'Бесплатное'}
              </Badge>
            </dd>
          </div>

          {/* Is Government Task */}
          <div>
            <dt className="text-sm font-medium text-muted-foreground mb-2">
              Госзадание
            </dt>
            <dd className="flex items-center gap-2">
              {event.isGovernmentTask ? (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Да</span>
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Нет</span>
                </>
              )}
            </dd>
          </div>
        </div>

        {!event.budget && !event.isPaid && !event.isGovernmentTask && (
          <div className="text-center py-4 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Финансовая информация не указана</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
