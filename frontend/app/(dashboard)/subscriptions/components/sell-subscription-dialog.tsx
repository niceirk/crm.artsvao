'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, startOfMonth, endOfMonth, getDaysInMonth, getDate } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSellSubscription } from '@/hooks/use-subscriptions';
import { useSubscriptionTypesByGroup } from '@/hooks/use-subscription-types';
import { useGroups } from '@/hooks/use-groups';
import { apiClient } from '@/lib/api/client';
import type { Client } from '@/lib/types/clients';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  clientId: z.string().min(1, 'Выберите клиента'),
  groupId: z.string().min(1, 'Выберите группу'),
  subscriptionTypeId: z.string().min(1, 'Выберите тип абонемента'),
  validMonth: z.date({
    required_error: 'Выберите месяц начала',
  }),
  purchasedMonths: z.coerce.number().min(1, 'Минимум 1 месяц').max(12, 'Максимум 12 месяцев').default(1),
});

type FormValues = z.infer<typeof formSchema>;

interface SellSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: string;
}

export function SellSubscriptionDialog({
  open,
  onOpenChange,
  preselectedClientId,
}: SellSubscriptionDialogProps) {
  const sellMutation = useSellSubscription();
  const { data: groups } = useGroups();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const { data: subscriptionTypes } = useSubscriptionTypesByGroup(selectedGroupId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: '',
      groupId: '',
      subscriptionTypeId: '',
      purchasedMonths: 1,
    },
  });

  const watchedValues = form.watch();

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        const response = await apiClient.get<{ data: Client[] }>('/clients?limit=1000');
        setClients(response.data.data);
      } catch (error) {
        console.error('Failed to load clients:', error);
      }
    };
    if (open) {
      loadClients();
    }
  }, [open]);

  // Set preselected client
  useEffect(() => {
    if (preselectedClientId && clients.length > 0) {
      form.setValue('clientId', preselectedClientId);
      const client = clients.find(c => c.id === preselectedClientId);
      setSelectedClient(client || null);
    }
  }, [preselectedClientId, clients, form]);

  // Update selected client when clientId changes
  useEffect(() => {
    const clientId = watchedValues.clientId;
    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      setSelectedClient(client || null);
    } else {
      setSelectedClient(null);
    }
  }, [watchedValues.clientId, clients]);

  // Update selected group
  useEffect(() => {
    setSelectedGroupId(watchedValues.groupId || '');
    // Reset subscription type when group changes
    if (watchedValues.groupId) {
      form.setValue('subscriptionTypeId', '');
    }
  }, [watchedValues.groupId, form]);

  // Calculate price with discount
  const priceCalculation = useMemo(() => {
    const subscriptionTypeId = watchedValues.subscriptionTypeId;
    const validMonth = watchedValues.validMonth;
    const purchasedMonths = watchedValues.purchasedMonths || 1;

    if (!subscriptionTypeId || !validMonth) {
      return null;
    }

    const subscriptionType = subscriptionTypes?.find(st => st.id === subscriptionTypeId);
    if (!subscriptionType) {
      return null;
    }

    const basePrice = subscriptionType.price;
    const totalMonths = purchasedMonths;

    // Calculate proportional price for the first month
    const daysInMonth = getDaysInMonth(validMonth);
    const startDay = getDate(validMonth);
    const remainingDays = daysInMonth - startDay + 1;
    const proportionalMultiplier = remainingDays / daysInMonth;

    // First month proportional + other months full price
    const firstMonthPrice = basePrice * proportionalMultiplier;
    const otherMonthsPrice = basePrice * (totalMonths - 1);
    let totalPrice = firstMonthPrice + otherMonthsPrice;

    // Apply discount from benefit category
    let discountAmount = 0;
    if (selectedClient?.benefitCategory) {
      const discountPercent = selectedClient.benefitCategory.discountPercent;
      discountAmount = totalPrice * (discountPercent / 100);
    }

    const finalPrice = totalPrice - discountAmount;

    return {
      basePrice: totalPrice,
      discountAmount,
      discountPercent: selectedClient?.benefitCategory?.discountPercent || 0,
      finalPrice,
      isProportional: proportionalMultiplier < 1,
      proportionalMultiplier,
      daysInMonth,
      remainingDays,
    };
  }, [watchedValues, subscriptionTypes, selectedClient]);

  const onSubmit = async (values: FormValues) => {
    try {
      await sellMutation.mutateAsync({
        clientId: values.clientId,
        groupId: values.groupId,
        subscriptionTypeId: values.subscriptionTypeId,
        validMonth: format(values.validMonth, 'yyyy-MM'),
        purchasedMonths: values.purchasedMonths,
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handling in hooks
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Продать абонемент</DialogTitle>
          <DialogDescription>
            Заполните информацию для продажи абонемента клиенту
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!preselectedClientId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите клиента" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.lastName} {client.firstName} ({client.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите группу" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} ({group.studio.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subscription Type Selection */}
            <FormField
              control={form.control}
              name="subscriptionTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип абонемента *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedGroupId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип абонемента" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subscriptionTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} - {formatCurrency(type.price)} ({type.type === 'UNLIMITED' ? 'Безлимитный' : 'Разовые посещения'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {!selectedGroupId && 'Сначала выберите группу'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Month */}
            <FormField
              control={form.control}
              name="validMonth"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Месяц начала *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'LLLL yyyy', { locale: require('date-fns/locale/ru').ru })
                          ) : (
                            <span>Выберите месяц</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Дата начала действия абонемента
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Purchased Months */}
            <FormField
              control={form.control}
              name="purchasedMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Количество месяцев *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Количество месяцев абонемента (1-12)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Price Calculation */}
            {priceCalculation && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-3">Расчет стоимости:</h4>
                <div className="space-y-2 text-sm">
                  {priceCalculation.isProportional && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Пропорциональный расчет:</span>
                      <span>{priceCalculation.remainingDays} из {priceCalculation.daysInMonth} дней ({Math.round(priceCalculation.proportionalMultiplier * 100)}%)</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Базовая цена:</span>
                    <span className="font-medium">{formatCurrency(priceCalculation.basePrice)}</span>
                  </div>
                  {priceCalculation.discountAmount > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Скидка ({priceCalculation.discountPercent}%):</span>
                      <span>-{formatCurrency(priceCalculation.discountAmount)}</span>
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
                {sellMutation.isPending ? 'Создание...' : 'Продать абонемент'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
