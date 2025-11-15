'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, CreditCard, CalendarCheck, Receipt, AlertCircle } from 'lucide-react';
import type { Client } from '@/lib/types/clients';

interface ClientHistoryCardProps {
  client: Client;
}

export function ClientHistoryCard({ client }: ClientHistoryCardProps) {
  // TODO: Получать данные из API когда модули будут готовы
  const subscriptions: any[] = [];
  const attendance: any[] = [];
  const payments: any[] = [];

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
          Абонементы, посещения и платежи клиента
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="subscriptions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
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

          <TabsContent value="subscriptions" className="mt-4">
            {subscriptions.length === 0 ? (
              <EmptyState message="Нет абонементов" />
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    {/* TODO: Компонент абонемента */}
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
    </Card>
  );
}
