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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { ClientSearch } from '@/components/clients/client-search';
import { useSellService } from '@/hooks/use-subscriptions';
import { useIndependentServices } from '@/hooks/use-nomenclature';
import type { ServiceSale } from '@/lib/types/subscriptions';

const formSchema = z.object({
  clientId: z.string().min(1, 'Выберите клиента'),
  serviceId: z.string().min(1, 'Выберите услугу'),
  quantity: z.coerce.number().min(1, 'Минимум 1').default(1),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SellServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: string;
  onSuccess?: (sale: ServiceSale) => void;
}

export function SellServiceDialog({
  open,
  onOpenChange,
  preselectedClientId,
  onSuccess,
}: SellServiceDialogProps) {
  const sellMutation = useSellService();
  const { data: services } = useIndependentServices();
  const [serviceSearch, setServiceSearch] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: '',
      serviceId: '',
      quantity: 1,
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

  // Filter active services
  const activeServices = useMemo(() => {
    return services?.filter((s) => s.isActive) ?? [];
  }, [services]);

  const normalizedServiceSearch = serviceSearch.trim().toLowerCase();
  const filteredServices = activeServices.filter((service) => {
    const label = `${service.name} ${service.category?.name ?? ''}`.toLowerCase();
    return label.includes(normalizedServiceSearch);
  });

  const serviceOptions: ComboboxOption[] = filteredServices.map((service) => ({
    value: service.id,
    label: `${service.name} - ${formatCurrency(service.price)}${service.category ? ` (${service.category.name})` : ''}`,
  }));

  useEffect(() => {
    if (!open) {
      setServiceSearch('');
      form.reset({
        clientId: preselectedClientId || '',
        serviceId: '',
        quantity: 1,
        notes: '',
      });
    }
  }, [open, form, preselectedClientId]);

  // Set preselected client
  useEffect(() => {
    if (preselectedClientId && open) {
      form.setValue('clientId', preselectedClientId);
    }
  }, [preselectedClientId, open, form]);

  // Calculate total price
  const selectedService = useMemo(() => {
    const serviceId = watchedValues.serviceId;
    if (!serviceId) return null;
    return activeServices.find((s) => s.id === serviceId) || null;
  }, [watchedValues.serviceId, activeServices]);

  const totalPrice = useMemo(() => {
    if (!selectedService) return 0;
    return selectedService.price * (watchedValues.quantity || 1);
  }, [selectedService, watchedValues.quantity]);

  const onSubmit = async (values: FormValues) => {
    try {
      const sale = await sellMutation.mutateAsync({
        clientId: values.clientId,
        serviceId: values.serviceId,
        quantity: values.quantity,
        notes: values.notes || undefined,
      });
      onSuccess?.(sale);
      onOpenChange(false);
      form.reset();
    } catch {
      // Error handling in hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Продать услугу</DialogTitle>
          <DialogDescription>
            Выберите клиента и услугу для продажи
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
                      placeholder="Поиск клиента..."
                      disabled={!!preselectedClientId}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Selection */}
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Услуга *</FormLabel>
                  <Combobox
                    options={serviceOptions}
                    value={field.value || undefined}
                    onValueChange={(value) => field.onChange(value ?? '')}
                    placeholder="Выберите услугу"
                    searchValue={serviceSearch}
                    onSearchChange={setServiceSearch}
                    emptyText="Услуги не найдены"
                    aria-label="Услуга"
                    allowEmpty={false}
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
                  <FormLabel>Количество *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
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
                      placeholder="Дополнительная информация"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Price Calculation */}
            {selectedService && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-3">Расчет стоимости:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Цена за единицу:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedService.price)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Количество:</span>
                    <span className="font-medium">{watchedValues.quantity || 1}</span>
                  </div>
                  {selectedService.vatRate > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>НДС:</span>
                      <span>{selectedService.vatRate}%</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t text-base font-bold">
                    <span>К оплате:</span>
                    <span>{formatCurrency(totalPrice)}</span>
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
                {sellMutation.isPending ? 'Продажа...' : 'Продать услугу'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
