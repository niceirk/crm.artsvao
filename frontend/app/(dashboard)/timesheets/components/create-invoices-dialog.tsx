'use client';

import { useState } from 'react';
import { format, addMonths, parse } from 'date-fns';
import { ru } from 'date-fns/locale';
import { FileText, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TimesheetClient } from '@/lib/types/timesheets';

interface CreateInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: TimesheetClient[];
  groupId: string;
  currentMonth: string;
  onCreateInvoices: (params: {
    clientIds: string[];
    groupId: string;
    targetMonth: string;
    sendNotifications: boolean;
  }) => Promise<void>;
  isLoading: boolean;
}

export function CreateInvoicesDialog({
  open,
  onOpenChange,
  clients,
  groupId,
  currentMonth,
  onCreateInvoices,
  isLoading,
}: CreateInvoicesDialogProps) {
  // Следующий месяц для формирования счетов
  const nextMonth = format(
    addMonths(parse(currentMonth, 'yyyy-MM', new Date()), 1),
    'yyyy-MM'
  );
  const nextMonthDisplay = format(
    addMonths(parse(currentMonth, 'yyyy-MM', new Date()), 1),
    'LLLL yyyy',
    { locale: ru }
  );

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Общая сумма счетов
  const totalAmount = clients.reduce(
    (sum, c) => sum + (c.nextMonthInvoice ?? 0),
    0
  );

  const handleCreate = async (sendNotifications: boolean) => {
    await onCreateInvoices({
      clientIds: clients.map((c) => c.id),
      groupId,
      targetMonth: nextMonth,
      sendNotifications,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Формирование счетов на {nextMonthDisplay}
          </DialogTitle>
          <DialogDescription>
            Будут сформированы счета для {clients.length} клиентов с учетом
            компенсаций за текущий месяц.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Клиент</TableHead>
                <TableHead className="text-right">Абонемент</TableHead>
                <TableHead className="text-right">Компенсация</TableHead>
                <TableHead className="text-right">К оплате</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const compensation =
                  client.compensation.adjustedAmount ??
                  client.compensation.calculatedAmount;
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.lastName} {client.firstName}
                    </TableCell>
                    <TableCell className="text-right">
                      {client.subscription?.price
                        ? formatMoney(client.subscription.price)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {compensation > 0 ? `-${formatMoney(compensation)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {client.nextMonthInvoice !== null
                        ? formatMoney(client.nextMonthInvoice)
                        : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">
              Всего счетов: {clients.length}
            </span>
            <span className="text-lg font-bold">
              Итого: {formatMoney(totalAmount)}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleCreate(false)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Сформировать
          </Button>
          <Button onClick={() => handleCreate(true)} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Сформировать и отправить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
