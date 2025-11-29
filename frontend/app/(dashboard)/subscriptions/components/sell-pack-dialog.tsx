'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
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
import { Switch } from '@/components/ui/switch';
import { useSellSingleSessionPack } from '@/hooks/use-subscriptions';
import { useGroups } from '@/hooks/use-groups';
import { apiClient } from '@/lib/api/client';
import { getClient } from '@/lib/api/clients';
import type { Client } from '@/lib/types/clients';
import type { Subscription } from '@/lib/types/subscriptions';

const formSchema = z.object({
  clientId: z.string().min(1, 'Выберите клиента'),
  groupId: z.string().min(1, 'Выберите группу'),
  quantity: z.number().min(1, 'Минимум 1 занятие').max(50, 'Максимум 50 занятий'),
  notes: z.string().optional(),
  applyBenefit: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface SellPackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: string;
  preselectedGroupId?: string;
  onSuccess?: (subscription: Subscription) => void;
}

export function SellPackDialog({
  open,
  onOpenChange,
  preselectedClientId,
  preselectedGroupId,
  onSuccess,
}: SellPackDialogProps) {
  const sellMutation = useSellSingleSessionPack();
  const { data: groups } = useGroups();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string; singleSessionPrice: number } | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const debouncedClientSearch = useDebouncedValue(clientSearch, 300);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: '',
      groupId: '',
      quantity: 5,
      notes: '',
      applyBenefit: true,
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
    const label = `${group.name} ${group.studio.name}`.toLowerCase();
    return label.includes(normalizedGroupSearch);
  });

  const clientOptions: ComboboxOption[] = clients.map((client) => ({
    value: client.id,
    label: `${client.lastName} ${client.firstName} (${client.phone})`,
  }));

  const groupOptions: ComboboxOption[] = filteredGroups.map((group) => ({
    value: group.id,
    label: `${group.name} (${group.studio.name}) - ${formatCurrency(group.singleSessionPrice || 0)}/занятие`,
  }));

  // Load clients with server-side search
  useEffect(() => {
    const loadClients = async () => {
      if (!open) {
        setClients([]);
        return;
      }

      try {
        setIsLoadingClients(true);
        const searchParam = debouncedClientSearch ? `&search=${encodeURIComponent(debouncedClientSearch)}` : '';
        const response = await apiClient.get<{ data: Client[] }>(`/clients?limit=50&page=1${searchParam}`);
        setClients(response.data.data);
      } catch (error) {
        console.error('Failed to load clients:', error);
      } finally {
        setIsLoadingClients(false);
      }
    };
    loadClients();
  }, [open, debouncedClientSearch]);

  useEffect(() => {
    if (!open) {
      setClientSearch('');
      setGroupSearch('');
      form.reset();
    }
  }, [open, form]);

  // Set preselected client
  useEffect(() => {
    if (preselectedClientId && clients.length > 0) {
      form.setValue('clientId', preselectedClientId);
      const client = clients.find(c => c.id === preselectedClientId);
      setSelectedClient(client || null);
    }
  }, [preselectedClientId, clients, form]);

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

  // Update selected client when clientId changes
  useEffect(() => {
    const clientId = watchedValues.clientId;
    if (!clientId) {
      setSelectedClient(null);
      return;
    }

    const cachedClient = clients.find((c) => c.id === clientId) || null;
    setSelectedClient(cachedClient);

    if (cachedClient?.benefitCategory) {
      return;
    }

    let isActive = true;
    const loadClientDetail = async () => {
      try {
        const client = await getClient(clientId);
        if (isActive) {
          setSelectedClient(client);
        }
      } catch (error) {
        console.error('Failed to load client details:', error);
      }
    };

    loadClientDetail();

    return () => {
      isActive = false;
    };
  }, [watchedValues.clientId, clients]);

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

  // Calculate price
  const priceCalculation = useMemo(() => {
    if (!selectedGroup || !watchedValues.quantity) {
      return null;
    }

    const basePrice = selectedGroup.singleSessionPrice * watchedValues.quantity;
    const discountPercent = watchedValues.applyBenefit && selectedClient?.benefitCategory
      ? selectedClient.benefitCategory.discountPercent
      : 0;
    const discountAmount = Math.round((basePrice * discountPercent) / 100);
    const finalPrice = basePrice - discountAmount;

    return {
      pricePerSession: selectedGroup.singleSessionPrice,
      quantity: watchedValues.quantity,
      basePrice,
      discountPercent,
      discountAmount,
      finalPrice,
    };
  }, [selectedGroup, watchedValues.quantity, watchedValues.applyBenefit, selectedClient]);

  const onSubmit = async (values: FormValues) => {
    try {
      const subscription = await sellMutation.mutateAsync({
        clientId: values.clientId,
        groupId: values.groupId,
        quantity: values.quantity,
        notes: values.notes,
        applyBenefit: values.applyBenefit,
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
          <DialogTitle>Продать пакет разовых занятий</DialogTitle>
          <DialogDescription>
            Продажа нескольких разовых занятий клиенту без привязки к датам
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
                  <Combobox
                    options={clientOptions}
                    value={field.value || undefined}
                    onValueChange={(value) => field.onChange(value ?? '')}
                    placeholder="Выберите клиента"
                    searchValue={clientSearch}
                    onSearchChange={setClientSearch}
                    emptyText="Клиенты не найдены"
                    aria-label="Клиент"
                    disabled={!!preselectedClientId}
                    allowEmpty={false}
                  />
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

            {/* Apply Benefit */}
            <FormField
              control={form.control}
              name="applyBenefit"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-1">
                    <FormLabel className="mb-0">Применить льготу</FormLabel>
                    <FormDescription>
                      {selectedClient?.benefitCategory
                        ? `${selectedClient.benefitCategory.name}: скидка ${selectedClient.benefitCategory.discountPercent}%`
                        : 'У клиента нет активной льготы'}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!selectedClient?.benefitCategory}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
                  <div className="flex justify-between">
                    <span>Базовая стоимость:</span>
                    <span className="font-medium">
                      {formatCurrency(priceCalculation.basePrice)}
                    </span>
                  </div>
                  {priceCalculation.discountAmount > 0 ? (
                    <div className="flex justify-between text-destructive">
                      <span>Скидка ({priceCalculation.discountPercent}%):</span>
                      <span>-{formatCurrency(priceCalculation.discountAmount)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Скидка:</span>
                      <span>Не применяется</span>
                    </div>
                  )}
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
                {sellMutation.isPending ? 'Создание...' : 'Продать пакет'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
