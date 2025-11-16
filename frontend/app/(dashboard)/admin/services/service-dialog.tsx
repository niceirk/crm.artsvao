'use client';

import { useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateService, useUpdateService } from '@/hooks/use-services';
import { useServiceCategories } from '@/hooks/use-service-categories';
import type { Service, ServiceType, UnitOfMeasure, WriteOffTiming } from '@/lib/types/services';

const formSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Выберите категорию'),
  serviceType: z.enum(['SUBSCRIPTION', 'RENTAL', 'SINGLE_SESSION', 'INDIVIDUAL_LESSON', 'OTHER']),
  basePrice: z.coerce.number().min(0, 'Минимум 0'),
  vatRate: z.coerce.number().min(0).max(100).default(20),
  unitOfMeasure: z.enum(['MONTH', 'HOUR', 'SESSION', 'DAY', 'PIECE']),
  writeOffTiming: z.enum(['ON_SALE', 'ON_USE']),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service;
}

export function ServiceDialog({ open, onOpenChange, service }: ServiceDialogProps) {
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const { data: categories } = useServiceCategories();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      categoryId: '',
      serviceType: 'SUBSCRIPTION' as ServiceType,
      basePrice: 0,
      vatRate: 20,
      unitOfMeasure: 'MONTH' as UnitOfMeasure,
      writeOffTiming: 'ON_SALE' as WriteOffTiming,
      isActive: true,
    },
  });

  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        description: service.description || '',
        categoryId: service.categoryId,
        serviceType: service.serviceType,
        basePrice: service.basePrice,
        vatRate: service.vatRate,
        unitOfMeasure: service.unitOfMeasure,
        writeOffTiming: service.writeOffTiming,
        isActive: service.isActive,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        categoryId: '',
        serviceType: 'SUBSCRIPTION',
        basePrice: 0,
        vatRate: 20,
        unitOfMeasure: 'MONTH',
        writeOffTiming: 'ON_SALE',
        isActive: true,
      });
    }
  }, [service, form, open]);

  // Калькулятор НДС
  const basePrice = form.watch('basePrice');
  const vatRate = form.watch('vatRate');
  const priceWithVat = useMemo(() => {
    return basePrice * (1 + vatRate / 100);
  }, [basePrice, vatRate]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (service) {
        await updateMutation.mutateAsync({ id: service.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handling in hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? 'Редактировать' : 'Создать'} услугу</DialogTitle>
          <DialogDescription>
            {service ? 'Внесите изменения' : 'Заполните информацию о новой услуге'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название *</FormLabel>
                  <FormControl>
                    <Input placeholder="Абонемент на танцы..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Категория *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип услуги *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SUBSCRIPTION">Абонемент</SelectItem>
                        <SelectItem value="RENTAL">Аренда</SelectItem>
                        <SelectItem value="SINGLE_SESSION">Разовое занятие</SelectItem>
                        <SelectItem value="INDIVIDUAL_LESSON">Индивидуальный урок</SelectItem>
                        <SelectItem value="OTHER">Прочее</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitOfMeasure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Единица измерения *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MONTH">Месяц</SelectItem>
                        <SelectItem value="HOUR">Час</SelectItem>
                        <SelectItem value="SESSION">Занятие</SelectItem>
                        <SelectItem value="DAY">День</SelectItem>
                        <SelectItem value="PIECE">Штука</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Базовая цена *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ставка НДС (%) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} {...field} />
                    </FormControl>
                    <FormDescription>0 для образовательных услуг</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Калькулятор НДС */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="text-sm font-medium mb-2">Автоматический расчет:</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Базовая цена:</span>
                  <span className="font-medium">{Number(basePrice).toFixed(2)} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">НДС ({Number(vatRate)}%):</span>
                  <span className="font-medium">
                    {(Number(priceWithVat) - Number(basePrice)).toFixed(2)} ₽
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground font-medium">Цена с НДС:</span>
                  <span className="font-bold text-lg">{Number(priceWithVat).toFixed(2)} ₽</span>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="writeOffTiming"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Модель списания *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ON_SALE">При продаже</SelectItem>
                      <SelectItem value="ON_USE">При использовании</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Когда списывать услугу со счета
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Краткое описание услуги..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Активна</FormLabel>
                    <FormDescription>Услуга доступна для использования</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {service ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
