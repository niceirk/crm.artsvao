'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { ClientSearch } from '@/components/clients/client-search';
import { useSellSingleSession } from '@/hooks/use-subscriptions';
import { useGroups } from '@/hooks/use-groups';
import type { Client } from '@/lib/types/clients';
import type { Subscription } from '@/lib/types/subscriptions';

const formSchema = z.object({
  clientId: z.string().min(1, 'Выберите клиента'),
  groupId: z.string().min(1, 'Выберите группу'),
  quantity: z.number().min(1, 'Минимум 1 занятие').max(50, 'Максимум 50 занятий'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SellSingleSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: string;
  preselectedGroupId?: string;
  onSuccess?: (subscription: Subscription) => void;
}

export function SellSingleSessionsDialog({
  open,
  onOpenChange,
  preselectedClientId,
  preselectedGroupId,
  onSuccess,
}: SellSingleSessionsDialogProps) {
  const sellMutation = useSellSingleSession();
  const { data: groups } = useGroups({ limit: 1000 });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string; singleSessionPrice: number } | null>(null);
  const [groupSearch, setGroupSearch] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: '',
      groupId: '',
      quantity: 5,
      notes: '',
    },
  });

  const watchedValues = form.watch();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(Number(amount));
  };

  const groupList = groups?.data ?? [];
  const normalizedGroupSearch = groupSearch.trim().toLowerCase();
  const filteredGroups = groupList.filter((group) => {
    const label = `${group.name} ${group.studio?.name ?? ''}`.toLowerCase();
    return label.includes(normalizedGroupSearch);
  });

  const groupOptions: ComboboxOption[] = filteredGroups.map((group) => ({
    value: group.id,
    label: `${group.name} (${group.studio?.name ?? '-'}) - ${formatCurrency(group.singleSessionPrice || 0)}/занятие`,
  }));

  useEffect(() => {
    if (!open) {
      setGroupSearch('');
      form.reset();
    }
  }, [open, form]);

  // Set preselected client
  useEffect(() => {
    if (preselectedClientId) {
      form.setValue('clientId', preselectedClientId);
    }
  }, [preselectedClientId, form]);

  useEffect(() => {
    if (preselectedGroupId) {
      form.setValue('groupId', preselectedGroupId);
      const group = groupList.find(g => g.id === preselectedGroupId);
      if (group) {
        setSelectedGroup({
          id: group.id,
          name: group.name,
          singleSessionPrice: group.singleSessionPrice || 0,
        });
      }
    }
  }, [preselectedGroupId, form, groupList]);

  // Update selected group
  useEffect(() => {
    const groupId = watchedValues.groupId;
    if (!groupId) {
      setSelectedGroup(null);
      return;
    }
    const group = groupList.find(g => g.id === groupId);
    if (group) {
      setSelectedGroup({
        id: group.id,
        name: group.name,
        singleSessionPrice: group.singleSessionPrice || 0,
      });
    }
  }, [watchedValues.groupId, groupList]);

  // Calculate price (без скидок - льготы не применяются к разовым)
  const priceCalculation = useMemo(() => {
    if (!selectedGroup || !watchedValues.quantity) {
      return null;
    }

    const basePrice = selectedGroup.singleSessionPrice * watchedValues.quantity;

    return {
      pricePerSession: selectedGroup.singleSessionPrice,
      quantity: watchedValues.quantity,
      basePrice,
      finalPrice: basePrice,
    };
  }, [selectedGroup, watchedValues.quantity]);

  const onSubmit = async (values: FormValues) => {
    try {
      const subscription = await sellMutation.mutateAsync({
        clientId: values.clientId,
        groupId: values.groupId,
        quantity: values.quantity,
        notes: values.notes,
      });
      onSuccess?.(subscription);
      onOpenChange(false);
      form.reset();
    } catch {
      // Error handling in hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Продать разовые посещения</DialogTitle>
          <DialogDescription>
            Продажа разовых занятий клиенту без привязки к датам
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Client Selection */}
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Клиент *</FormLabel>
                  <FormControl>
                    <ClientSearch
                      value={field.value || undefined}
                      onValueChange={(value) => field.onChange(value ?? '')}
                      onClientSelect={(client) => setSelectedClient(client)}
                      placeholder="Поиск клиента..."
                      disabled={!!preselectedClientId}
                    />
                  </FormControl>
                  {selectedClient?.benefitCategory && (
                    <div className="mt-2">
                      <Badge variant="secondary">
                        {selectedClient.benefitCategory.name}: скидка {selectedClient.benefitCategory.discountPercent}%
                      </Badge>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Group Selection */}
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Группа *</FormLabel>
                  <Combobox
                    options={groupOptions}
                    value={field.value || undefined}
                    onValueChange={(value) => field.onChange(value ?? '')}
                    placeholder="Выберите группу"
                    searchValue={groupSearch}
                    onSearchChange={setGroupSearch}
                    emptyText="Группы не найдены"
                    aria-label="Группа"
                    allowEmpty={false}
                    disabled={!!preselectedGroupId}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Количество занятий *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormDescription>
                    От 1 до 50 занятий
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Примечание</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Дополнительная информация..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Информация о льготе */}
            {selectedClient?.benefitCategory && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                <span className="font-medium">Внимание:</span> У клиента есть льгота ({selectedClient.benefitCategory.name}: {selectedClient.benefitCategory.discountPercent}%), но она не применяется к разовым занятиям.
              </div>
            )}

            {/* Price Calculation */}
            {priceCalculation && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-3">Расчет стоимости:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Цена за занятие:</span>
                    <span>{formatCurrency(priceCalculation.pricePerSession)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Количество:</span>
                    <span>{priceCalculation.quantity} занятий</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t text-base font-bold">
                    <span>К оплате:</span>
                    <span>{formatCurrency(priceCalculation.finalPrice)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={sellMutation.isPending}>
                {sellMutation.isPending ? 'Создание...' : 'Продать разовое'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
