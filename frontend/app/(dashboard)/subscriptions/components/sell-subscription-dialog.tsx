'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
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
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useSellSubscription } from '@/hooks/use-subscriptions';
import { useSubscriptionTypesByGroup } from '@/hooks/use-subscription-types';
import { useGroups } from '@/hooks/use-groups';
import { apiClient } from '@/lib/api/client';
import { getClient } from '@/lib/api/clients';
import { groupsApi } from '@/lib/api/groups';
import type { Client } from '@/lib/types/clients';
import type { GroupScheduleEntry } from '@/lib/types/groups';
import type { Subscription } from '@/lib/types/subscriptions';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  clientId: z.string().min(1, 'Выберите клиента'),
  groupId: z.string().min(1, 'Выберите группу'),
  subscriptionTypeId: z.string().min(1, 'Выберите тип абонемента'),
  startDate: z.date({
    required_error: 'Выберите дату начала занятий',
  }),
  applyBenefit: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

type PriceCalculationResult = {
  basePrice: number;
  discountAmount: number;
  discountPercent: number;
  finalPrice: number;
  pricePerLesson: number;
  totalPlanned: number;
  remainingPlanned: number;
};

interface SellSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: string;
  preselectedGroupId?: string;
  onSuccess?: (subscription: Subscription) => void;
  excludeSingleVisit?: boolean; // Исключить разовые посещения из списка типов
}

export function SellSubscriptionDialog({
  open,
  onOpenChange,
  preselectedClientId,
  preselectedGroupId,
  onSuccess,
  excludeSingleVisit = false,
}: SellSubscriptionDialogProps) {
  const sellMutation = useSellSubscription();
  const { data: groups } = useGroups();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [scheduleStats, setScheduleStats] = useState<{ totalPlanned: number; remainingPlanned: number } | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const debouncedClientSearch = useDebouncedValue(clientSearch, 300);

  const { data: subscriptionTypes } = useSubscriptionTypesByGroup(selectedGroupId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: '',
      groupId: '',
      subscriptionTypeId: '',
      applyBenefit: true,
    },
  });

  const watchedValues = form.watch();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };


  const groupList = groups?.data ?? [];
  const normalizedGroupSearch = groupSearch.trim().toLowerCase();
  const filteredGroups = groupList.filter((group) => {
    const label = `${group.name} ${group.studio.name}`.toLowerCase();
    return label.includes(normalizedGroupSearch);
  });

  const normalizedSubscriptionSearch = subscriptionSearch.trim().toLowerCase();
  const filteredSubscriptionTypes =
    subscriptionTypes?.filter((type) => {
      // Исключаем разовые посещения если установлен флаг
      if (excludeSingleVisit && type.type === 'SINGLE_VISIT') {
        return false;
      }
      const label = `${type.name} ${type.group?.name ?? ''}`.toLowerCase();
      return label.includes(normalizedSubscriptionSearch);
    }) ?? [];

  const clientOptions: ComboboxOption[] = clients.map((client) => ({
    value: client.id,
    label: `${client.lastName} ${client.firstName} (${client.phone})`,
  }));

  const groupOptions: ComboboxOption[] = filteredGroups.map((group) => ({
    value: group.id,
    label: `${group.name} (${group.studio.name})`,
  }));

  const subscriptionOptions: ComboboxOption[] =
    filteredSubscriptionTypes.map((type) => ({
      value: type.id,
      label: `${type.name} - ${formatCurrency(type.price)} ${type.type === 'UNLIMITED' ? 'Безлимитный' : 'Разовые посещения'}`,
    })) ?? [];

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
      setSubscriptionSearch('');
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

  useEffect(() => {
    if (preselectedGroupId) {
      form.setValue('groupId', preselectedGroupId);
      setSelectedGroupId(preselectedGroupId);
    }
  }, [preselectedGroupId, form]);

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
    setSelectedGroupId(watchedValues.groupId || '');
    // Reset subscription type when group changes
    if (watchedValues.groupId) {
      form.setValue('subscriptionTypeId', '');
    }
    setSubscriptionSearch('');
  }, [watchedValues.groupId, form]);

  useEffect(() => {
    const groupId = watchedValues.groupId;
    const startDate = watchedValues.startDate;

    if (!groupId || !startDate) {
      setScheduleStats(null);
      setScheduleError(null);
      setIsLoadingSchedule(false);
      return;
    }

    const loadScheduleStats = async () => {
      try {
        setIsLoadingSchedule(true);
        setScheduleError(null);
        const [year, month] = [
          startDate.getFullYear(),
          startDate.getMonth() + 1,
        ];
        const schedules: GroupScheduleEntry[] = await groupsApi.getGroupMonthlySchedule(
          groupId,
          year,
          month,
        );
        const plannedSchedules = schedules.filter(
          (schedule) => schedule.status === 'PLANNED',
        );

        const today = startOfDay(new Date());
        const selectedStart = startOfDay(startDate);
        const calculationStart =
          selectedStart > today ? selectedStart : today;

        const remainingPlanned = plannedSchedules.filter((schedule) => {
          const scheduleDate = startOfDay(new Date(schedule.date));
          return scheduleDate >= calculationStart;
        }).length;

        setScheduleStats({
          totalPlanned: plannedSchedules.length,
          remainingPlanned,
        });
      } catch (error) {
        console.error('Failed to load schedule stats:', error);
        setScheduleStats(null);
        setScheduleError('Не удалось загрузить расписание группы');
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    loadScheduleStats();
  }, [watchedValues.groupId, watchedValues.startDate]);

  // Calculate price with discount based on planned lessons
  const priceCalculation = useMemo<
    PriceCalculationResult | { error: string } | null
  >(() => {
    const subscriptionTypeId = watchedValues.subscriptionTypeId;
    const applyBenefit = watchedValues.applyBenefit;
    const startDate = watchedValues.startDate;

    if (!subscriptionTypeId || !startDate) {
      return null;
    }

    const subscriptionType = subscriptionTypes?.find(
      (st) => st.id === subscriptionTypeId,
    );
    if (!subscriptionType) {
      return null;
    }

    if (!scheduleStats) {
      return null;
    }

    if (scheduleStats.totalPlanned === 0) {
      return { error: 'Нет запланированных занятий на выбранный месяц' };
    }

    if (scheduleStats.remainingPlanned === 0) {
      return { error: 'Нет доступных занятий до конца выбранного месяца' };
    }

    const pricePerLesson = Math.round(
      subscriptionType.price / scheduleStats.totalPlanned,
    );
    const firstMonthPrice = pricePerLesson * scheduleStats.remainingPlanned;
    const totalPrice = Math.round(firstMonthPrice * 100) / 100;

    const discountPercent =
      applyBenefit && selectedClient?.benefitCategory
        ? selectedClient.benefitCategory.discountPercent
        : 0;
    const discountAmount =
      Math.round(((totalPrice * discountPercent) / 100) * 100) / 100;
    const finalPrice =
      Math.round((totalPrice - discountAmount) * 100) / 100;

    return {
      basePrice: totalPrice,
      discountAmount,
      discountPercent,
      finalPrice,
      pricePerLesson,
      totalPlanned: scheduleStats.totalPlanned,
      remainingPlanned: scheduleStats.remainingPlanned,
    };
  }, [watchedValues, subscriptionTypes, selectedClient, scheduleStats]);

  const onSubmit = async (values: FormValues) => {
    try {
      const subscription = await sellMutation.mutateAsync({
        clientId: values.clientId,
        groupId: values.groupId,
        subscriptionTypeId: values.subscriptionTypeId,
        validMonth: format(values.startDate, 'yyyy-MM'),
        startDate: format(values.startDate, 'yyyy-MM-dd'),
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

            {/* Subscription Type Selection */}
            <FormField
              control={form.control}
              name="subscriptionTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип абонемента *</FormLabel>
                  <Combobox
                    options={subscriptionOptions}
                    value={field.value || undefined}
                    onValueChange={(value) => field.onChange(value ?? '')}
                    placeholder="Выберите тип абонемента"
                    searchValue={subscriptionSearch}
                    onSearchChange={setSubscriptionSearch}
                    emptyText="Типы не найдены"
                    aria-label="Тип абонемента"
                    disabled={!selectedGroupId}
                    allowEmpty={false}
                  />
                  <FormDescription>
                    {!selectedGroupId && 'Сначала выберите группу'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Date */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Дата начала занятий *</FormLabel>
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
                            format(field.value, 'dd MMMM yyyy', { locale: ru })
                          ) : (
                            <span>Выберите дату</span>
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
                        locale={ru}
                        weekStartsOn={1}
                        captionLayout="dropdown"
                        fromYear={new Date().getFullYear()}
                        toYear={new Date().getFullYear() + 2}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Дата первого занятия и начала действия абонемента
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isLoadingSchedule && watchedValues.groupId && watchedValues.startDate && (
              <div className="rounded-lg border p-4 bg-muted/50 text-sm text-muted-foreground">
                Обновляем расчет стоимости по расписанию группы...
              </div>
            )}

            {scheduleError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {scheduleError}
              </div>
            )}

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
              'error' in priceCalculation ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  {priceCalculation.error}
                </div>
              ) : (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-medium mb-3">Расчет стоимости:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Запланировано занятий в месяце:</span>
                      <span>{priceCalculation.totalPlanned}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Доступно с даты продажи:</span>
                      <span>{priceCalculation.remainingPlanned}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Цена за занятие:</span>
                      <span className="font-medium">
                        {formatCurrency(priceCalculation.pricePerLesson)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Стоимость первого месяца:</span>
                      <span className="font-medium">
                        {formatCurrency(
                          priceCalculation.pricePerLesson *
                            priceCalculation.remainingPlanned,
                        )}
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
              )
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
