'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, CheckCircle, XCircle, Calendar, FileText, Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/lib/utils/toast';
import { useRecalculationDetails, useUpsertCompensation } from '@/hooks/use-timesheets';
import type { TimesheetClient, UnpaidInvoice } from '@/lib/types/timesheets';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  adjustedAmount: z.number().min(0, 'Сумма не может быть отрицательной').optional().nullable(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RecalculationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: TimesheetClient | null;
  groupId: string;
  month: string;
}

export function RecalculationSettingsDialog({
  open,
  onOpenChange,
  client,
  groupId,
  month,
}: RecalculationSettingsDialogProps) {
  // Состояния для настроек
  const [includeExcused, setIncludeExcused] = useState(true);
  const [includeMedCert, setIncludeMedCert] = useState(true);
  const [includeCancelled, setIncludeCancelled] = useState(true);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Загрузка детализации
  const { data: details, isLoading } = useRecalculationDetails(
    client?.id || null,
    groupId,
    month
  );

  const { mutateAsync: upsertCompensation, isPending } = useUpsertCompensation();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      adjustedAmount: undefined,
      notes: '',
    },
  });

  // Сброс при закрытии диалога
  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
    }
  }, [open]);

  // Инициализация при открытии (только один раз когда данные загружены)
  useEffect(() => {
    if (open && client && details?.unpaidInvoices && !initializedRef.current) {
      initializedRef.current = true;

      // Восстанавливаем сохранённые настройки или устанавливаем значения по умолчанию
      setIncludeExcused(client.compensation.includeExcused ?? true);
      setIncludeMedCert(client.compensation.includeMedCert ?? true);
      setIncludeCancelled(client.compensation.includeCancelled ?? true);

      // Для счетов - все выбраны по умолчанию, кроме исключённых
      const excluded = new Set(client.compensation.excludedInvoiceIds ?? []);
      const selected = details.unpaidInvoices
        .filter(inv => !excluded.has(inv.id))
        .map(inv => inv.id);
      setSelectedInvoiceIds(new Set(selected));

      form.reset({
        // Используем явную проверку на null - если adjustedAmount === null, значит нужно использовать рассчитанную сумму
        // Если adjustedAmount === 0, это валидное значение "ручная корректировка = 0"
        adjustedAmount: client.compensation.adjustedAmount !== null ? client.compensation.adjustedAmount : undefined,
        notes: client.compensation.notes || '',
      });
    }
  }, [open, client, details, form]);

  // Расчёт итоговой суммы перерасчёта
  const calculatedRecalculation = useMemo(() => {
    if (!client) return 0;

    let compensations = 0;

    // Компенсации за пропуски
    if (includeExcused) {
      compensations += client.compensation.baseCalculatedAmount || 0;
    }

    // Компенсации из мед. справок
    if (includeMedCert) {
      compensations += client.compensation.medCertCompensation || 0;
    }

    // Компенсации за отменённые занятия
    if (includeCancelled) {
      compensations += client.compensation.cancelledLessonsCompensation || 0;
    }

    // Задолженность (выбранные счета)
    const debt = details?.unpaidInvoices
      ?.filter(inv => selectedInvoiceIds.has(inv.id))
      .reduce((sum, inv) => sum + inv.totalAmount, 0) || 0;

    // Итог: Компенсации - Задолженность
    return compensations - debt;
  }, [client, details, includeExcused, includeMedCert, includeCancelled, selectedInvoiceIds]);

  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const toggleAllInvoices = () => {
    if (!details?.unpaidInvoices) return;
    if (selectedInvoiceIds.size === details.unpaidInvoices.length) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(details.unpaidInvoices.map(inv => inv.id)));
    }
  };

  const handleSubmit = async (data: FormData) => {
    if (!client) return;

    // Вычисляем исключённые счета (те что не выбраны)
    const excludedInvoiceIds = details?.unpaidInvoices
      ?.filter(inv => !selectedInvoiceIds.has(inv.id))
      .map(inv => inv.id) || [];

    // Вычисляем компоненты для сохранения
    const baseAmount = includeExcused ? (client.compensation.baseCalculatedAmount || 0) : 0;
    const medCertAmount = includeMedCert ? (client.compensation.medCertCompensation || 0) : 0;
    const cancelledAmount = includeCancelled ? (client.compensation.cancelledLessonsCompensation || 0) : 0;
    const debtAmountValue = details?.unpaidInvoices
      ?.filter(inv => selectedInvoiceIds.has(inv.id))
      .reduce((sum, inv) => sum + inv.totalAmount, 0) || 0;

    try {
      // Ждём завершения мутации и refetch данных
      await upsertCompensation({
        clientId: client.id,
        groupId,
        month,
        // Если поле пустое (null), отправляем null чтобы сбросить ручную корректировку
        // Если заполнено (включая 0), отправляем значение
        adjustedAmount: data.adjustedAmount,
        notes: data.notes,
        includeExcused,
        includeMedCert,
        includeCancelled,
        excludedInvoiceIds,
        baseAmount,
        medCertAmount,
        cancelledAmount,
        debtAmount: debtAmountValue,
      });
      toast.success('Перерасчёт сохранён', {
        description: 'Настройки перерасчёта успешно обновлены',
      });
      onOpenChange(false);
    } catch {
      toast.error('Ошибка', {
        description: 'Не удалось сохранить перерасчёт',
      });
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  if (!client) return null;

  const hasCompensations =
    (client.compensation.baseCalculatedAmount || 0) > 0 ||
    (client.compensation.medCertCompensation || 0) > 0 ||
    (client.compensation.cancelledLessonsCompensation || 0) > 0;

  const hasDebt = (details?.unpaidInvoices?.length || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Настройка перерасчёта</DialogTitle>
          <DialogDescription>
            {client.lastName} {client.firstName}
            {client.middleName ? ` ${client.middleName}` : ''} — {month}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-6 py-4">
            {/* СЕКЦИЯ: КОМПЕНСАЦИИ */}
            {hasCompensations && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold">Компенсации (уменьшают счёт)</h3>
                </div>

                {/* Пропуски по справке */}
                {(client.compensation.baseCalculatedAmount || 0) > 0 && (
                  <div
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-colors',
                      includeExcused ? 'bg-green-50 border-green-200' : 'bg-muted border-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={includeExcused}
                        onCheckedChange={(checked) => setIncludeExcused(!!checked)}
                      />
                      <div>
                        <div className="font-medium">Пропуски по уважительной причине</div>
                        <div className="text-sm text-muted-foreground">
                          {client.compensation.excusedCount} занятий x {formatMoney(client.compensation.pricePerLesson)}
                        </div>
                      </div>
                    </div>
                    <div className={cn('font-bold', includeExcused ? 'text-green-700' : 'text-muted-foreground line-through')}>
                      {formatMoney(client.compensation.baseCalculatedAmount || 0)}
                    </div>
                  </div>
                )}

                {/* Медицинские справки */}
                {(client.compensation.medCertCompensation || 0) > 0 && (
                  <div
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-colors',
                      includeMedCert ? 'bg-purple-50 border-purple-200' : 'bg-muted border-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={includeMedCert}
                        onCheckedChange={(checked) => setIncludeMedCert(!!checked)}
                      />
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Медицинские справки
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Компенсация за прошлые периоды
                        </div>
                      </div>
                    </div>
                    <div className={cn('font-bold', includeMedCert ? 'text-purple-700' : 'text-muted-foreground line-through')}>
                      {formatMoney(client.compensation.medCertCompensation || 0)}
                    </div>
                  </div>
                )}

                {/* Отменённые занятия */}
                {(client.compensation.cancelledLessonsCompensation || 0) > 0 && (
                  <div
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-colors',
                      includeCancelled ? 'bg-orange-50 border-orange-200' : 'bg-muted border-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={includeCancelled}
                        onCheckedChange={(checked) => setIncludeCancelled(!!checked)}
                      />
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <Ban className="h-4 w-4" />
                          Отменённые занятия
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {details?.cancelledSchedules?.length || 0} занятий с компенсацией
                        </div>
                      </div>
                    </div>
                    <div className={cn('font-bold', includeCancelled ? 'text-orange-700' : 'text-muted-foreground line-through')}>
                      {formatMoney(client.compensation.cancelledLessonsCompensation || 0)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* СЕКЦИЯ: ЗАДОЛЖЕННОСТЬ */}
            {hasDebt && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <h3 className="font-semibold">Задолженность (увеличивает счёт)</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={toggleAllInvoices}>
                      {selectedInvoiceIds.size === details?.unpaidInvoices?.length
                        ? 'Снять все'
                        : 'Выбрать все'}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {details?.unpaidInvoices?.map((invoice: UnpaidInvoice) => (
                      <div
                        key={invoice.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border transition-colors',
                          selectedInvoiceIds.has(invoice.id)
                            ? 'bg-red-50 border-red-200'
                            : 'bg-muted border-muted'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedInvoiceIds.has(invoice.id)}
                            onCheckedChange={() => toggleInvoice(invoice.id)}
                          />
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {invoice.invoiceNumber}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {invoice.period || formatDate(invoice.issuedAt)} • {invoice.status === 'OVERDUE' ? 'Просрочен' : invoice.status === 'PARTIALLY_PAID' ? 'Частично оплачен' : 'Ожидает оплаты'}
                            </div>
                          </div>
                        </div>
                        <div className={cn('font-bold', selectedInvoiceIds.has(invoice.id) ? 'text-red-700' : 'text-muted-foreground line-through')}>
                          +{formatMoney(invoice.totalAmount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ИТОГОВЫЙ ПЕРЕРАСЧЁТ */}
            <Separator />
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="font-semibold text-lg">Итоговый перерасчёт</div>
              <div
                className={cn(
                  'text-2xl font-bold',
                  calculatedRecalculation >= 0 ? 'text-green-700' : 'text-red-700'
                )}
              >
                {formatMoney(calculatedRecalculation)}
              </div>
            </div>

            {/* ФОРМА: Ручная корректировка */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="adjustedAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ручная корректировка итоговой суммы</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder={String(calculatedRecalculation)}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === '' ? null : Number(value));
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Оставьте пустым для использования рассчитанной суммы ({formatMoney(calculatedRecalculation)})
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Примечание</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Причина корректировки..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isPending}
                  >
                    Отмена
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Сохранить
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
