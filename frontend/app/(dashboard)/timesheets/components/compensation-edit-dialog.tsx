'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
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
import { toast } from '@/lib/utils/toast';
import { useUpdateCompensation } from '@/hooks/use-timesheets';
import type { TimesheetClient } from '@/lib/types/timesheets';

const formSchema = z.object({
  adjustedAmount: z.coerce
    .number()
    .min(0, 'Сумма не может быть отрицательной')
    .optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CompensationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: TimesheetClient | null;
}

export function CompensationEditDialog({
  open,
  onOpenChange,
  client,
}: CompensationEditDialogProps) {
  const { mutate: updateCompensation, isPending } = useUpdateCompensation();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      adjustedAmount: undefined,
      notes: '',
    },
  });

  // Сбросить форму при открытии с новым клиентом
  useEffect(() => {
    if (client && open) {
      form.reset({
        adjustedAmount:
          client.compensation.adjustedAmount ??
          client.compensation.calculatedAmount,
        notes: client.compensation.notes || '',
      });
    }
  }, [client, open, form]);

  const handleSubmit = (data: FormData) => {
    if (!client?.compensation.id) return;

    updateCompensation(
      {
        id: client.compensation.id,
        data: {
          adjustedAmount: data.adjustedAmount,
          notes: data.notes,
        },
      },
      {
        onSuccess: () => {
          toast.success('Компенсация обновлена', {
            description: 'Сумма компенсации успешно скорректирована',
          });
          onOpenChange(false);
        },
        onError: () => {
          toast.error('Ошибка', {
            description: 'Не удалось обновить компенсацию',
          });
        },
      }
    );
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Корректировка компенсации</DialogTitle>
          <DialogDescription>
            {client.lastName} {client.firstName}
            {client.middleName ? ` ${client.middleName}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Информация о расчете */}
          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Пропусков по ув. причине:
              </span>
              <span className="font-medium">
                {client.compensation.excusedCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Стоимость занятия:
              </span>
              <span className="font-medium">
                {formatMoney(client.compensation.pricePerLesson)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Расчетная сумма:</span>
              <span className="font-medium text-orange-600">
                {formatMoney(client.compensation.calculatedAmount)}
              </span>
            </div>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="adjustedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Скорректированная сумма</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder={String(
                          client.compensation.calculatedAmount
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Оставьте пустым для использования расчетной суммы
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
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Сохранить
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
