'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { ClientCombobox } from '@/components/client-combobox';
import { useNomenclature, useIndependentServices } from '@/hooks/use-nomenclature';
import { useCreateInvoice } from '@/hooks/use-invoices';
import type { CreateInvoiceDto, CreateInvoiceItemDto } from '@/lib/types/invoices';
import type { NomenclatureItem } from '@/lib/types/nomenclature';

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const invoiceItemSchema = z.object({
  serviceId: z.string().optional(),
  groupId: z.string().optional(),
  serviceType: z.enum(['SUBSCRIPTION', 'RENTAL', 'SINGLE_SESSION', 'INDIVIDUAL_LESSON', 'OTHER']),
  serviceName: z.string().min(1, 'Укажите название услуги'),
  serviceDescription: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Количество должно быть больше 0'),
  basePrice: z.coerce.number().min(0, 'Цена должна быть положительной'),
  vatRate: z.coerce.number().min(0).max(100),
  discountPercent: z.coerce.number().min(0).max(100).optional().default(0),
  writeOffTiming: z.enum(['ON_SALE', 'ON_USE']),
});

const createInvoiceSchema = z.object({
  clientId: z.string().min(1, 'Выберите клиента'),
  items: z.array(invoiceItemSchema).min(1, 'Добавьте хотя бы одну позицию'),
  discountAmount: z.coerce.number().min(0).optional().default(0),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>;

export function CreateInvoiceDialog({ open, onOpenChange }: CreateInvoiceDialogProps) {
  const { data: nomenclatureItems } = useNomenclature({ isActive: true });
  const { data: independentServices } = useIndependentServices();
  const createInvoice = useCreateInvoice();

  // Объединяем номенклатуру в единый список для выбора
  const allItems = [
    ...(nomenclatureItems || []),
    ...(independentServices?.filter(s => s.isActive) || []).map(s => ({
      id: s.id,
      type: 'INDEPENDENT_SERVICE' as const,
      name: s.name,
      description: s.description,
      price: s.price,
      vatRate: s.vatRate,
      isActive: s.isActive,
      category: s.category,
      createdAt: '',
      updatedAt: '',
    })),
  ];

  const form = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      clientId: '',
      items: [
        {
          serviceType: 'SINGLE_SESSION',
          serviceName: '',
          quantity: 1,
          basePrice: 0,
          vatRate: 20,
          discountPercent: 0,
          writeOffTiming: 'ON_USE',
        },
      ],
      discountAmount: 0,
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const handleServiceSelect = (index: number, itemId: string) => {
    const item = allItems?.find((s) => s.id === itemId);
    if (item) {
      // Маппинг типов номенклатуры на ServiceType для счёта
      const serviceTypeMap: Record<string, 'SUBSCRIPTION' | 'SINGLE_SESSION' | 'OTHER'> = {
        'SUBSCRIPTION': 'SUBSCRIPTION',
        'SINGLE_SESSION': 'SINGLE_SESSION',
        'VISIT_PACK': 'SINGLE_SESSION',
        'INDEPENDENT_SERVICE': 'OTHER',
      };

      form.setValue(`items.${index}.serviceId`, item.id);
      form.setValue(`items.${index}.serviceName`, item.name);
      form.setValue(`items.${index}.serviceType`, serviceTypeMap[item.type] || 'OTHER');
      form.setValue(`items.${index}.basePrice`, Number(item.price));
      form.setValue(`items.${index}.vatRate`, Number(item.vatRate));
      form.setValue(`items.${index}.writeOffTiming`, item.type === 'SUBSCRIPTION' ? 'ON_USE' : 'ON_SALE');

      // Извлекаем groupId из номенклатуры (для разовых посещений и абонементов)
      if (item.group?.id) {
        form.setValue(`items.${index}.groupId`, item.group.id);
      } else if (item.id.startsWith('single-')) {
        // Для разовых посещений ID имеет формат single-{groupId}
        form.setValue(`items.${index}.groupId`, item.id.replace('single-', ''));
      }
    }
  };

  const calculateItemTotal = (index: number) => {
    const item = form.watch(`items.${index}`);
    if (!item) return 0;

    const baseTotal = item.basePrice * item.quantity;
    const vatAmount = baseTotal * (item.vatRate / 100);
    const discount = baseTotal * ((item.discountPercent || 0) / 100);
    return baseTotal + vatAmount - discount;
  };

  const calculateTotal = () => {
    const items = form.watch('items');
    const itemsTotal = items.reduce((sum, _, index) => sum + calculateItemTotal(index), 0);
    const discount = form.watch('discountAmount') || 0;
    return itemsTotal - discount;
  };

  const onSubmit = async (values: CreateInvoiceFormValues) => {
    console.log('Form submitted with values:', values);
    try {
      const invoiceData: CreateInvoiceDto = {
        clientId: values.clientId,
        items: values.items.map((item) => ({
          serviceId: item.serviceId,
          groupId: item.groupId,
          serviceType: item.serviceType,
          serviceName: item.serviceName,
          serviceDescription: item.serviceDescription,
          quantity: item.quantity,
          basePrice: item.basePrice,
          unitPrice: item.basePrice,
          vatRate: item.vatRate,
          discountPercent: item.discountPercent || 0,
          writeOffTiming: item.writeOffTiming,
        })),
        discountAmount: values.discountAmount,
        dueDate: values.dueDate,
        notes: values.notes,
      };

      console.log('Sending invoice data:', invoiceData);
      await createInvoice.mutateAsync(invoiceData);
      console.log('Invoice created successfully');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      // Error is already handled by useCreateInvoice hook via toast
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать счет</DialogTitle>
          <DialogDescription>
            Заполните информацию о счете и добавьте позиции
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              console.log('Form submission attempted');
              console.log('Form errors:', form.formState.errors);
              console.log('Form errors JSON:', JSON.stringify(form.formState.errors, null, 2));
              console.log('Form values:', form.getValues());
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-6"
          >
            {/* Form Errors Display */}
            {Object.keys(form.formState.errors).length > 0 && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="font-medium text-destructive mb-2">Ошибки валидации:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                  {form.formState.errors.clientId && (
                    <li>{form.formState.errors.clientId.message}</li>
                  )}
                  {form.formState.errors.items && (
                    <>
                      {Array.isArray(form.formState.errors.items) ? (
                        form.formState.errors.items.map((itemError, index) => {
                          if (!itemError) return null;
                          return (
                            <li key={index}>
                              Позиция {index + 1}:
                              {itemError.serviceName && ` ${itemError.serviceName.message}`}
                              {itemError.quantity && ` ${itemError.quantity.message}`}
                              {itemError.basePrice && ` ${itemError.basePrice.message}`}
                              {itemError.vatRate && ` ${itemError.vatRate.message}`}
                            </li>
                          );
                        })
                      ) : (
                        <li>{String(form.formState.errors.items.message || 'Проверьте позиции счета')}</li>
                      )}
                    </>
                  )}
                  {form.formState.errors.discountAmount && (
                    <li>{form.formState.errors.discountAmount.message}</li>
                  )}
                </ul>
              </div>
            )}

            {/* Client Selection */}
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Клиент *</FormLabel>
                  <FormControl>
                    <ClientCombobox
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Начните вводить имя, телефон или email"
                      emptyMessage="Клиент не найден"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Invoice Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Позиции счета</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      serviceType: 'SINGLE_SESSION',
                      serviceName: '',
                      quantity: 1,
                      basePrice: 0,
                      vatRate: 20,
                      discountPercent: 0,
                      writeOffTiming: 'ON_USE',
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить позицию
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Услуга</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead className="w-[80px]">Кол-во</TableHead>
                      <TableHead className="w-[100px]">Цена</TableHead>
                      <TableHead className="w-[80px]">НДС %</TableHead>
                      <TableHead className="w-[80px]">Скидка %</TableHead>
                      <TableHead className="w-[120px] text-right">Итого</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Select onValueChange={(value) => handleServiceSelect(index, value)}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Выбрать" />
                            </SelectTrigger>
                            <SelectContent>
                              {allItems.length === 0 && (
                                <SelectItem value="empty" disabled>
                                  Нет доступных услуг
                                </SelectItem>
                              )}
                              {allItems?.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} ({item.price} руб.)
                                  {item.group && ` - ${item.group.name}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.serviceName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} placeholder="Название" className="h-9" />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    {...field}
                                    className="h-9"
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.basePrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    {...field}
                                    className="h-9"
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.vatRate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    {...field}
                                    className="h-9"
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.discountPercent`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    {...field}
                                    className="h-9"
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(calculateItemTotal(index))}
                        </TableCell>
                        <TableCell>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="h-9 w-9 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Additional Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discountAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Общая скидка (руб.)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormDescription>Дополнительная скидка на весь счет</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Срок оплаты</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={(date) => field.onChange(date || '')}
                        minDate={new Date()}
                        maxDate={new Date(new Date().getFullYear() + 50, 11, 31)}
                        toYear={new Date().getFullYear() + 50}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Примечания</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total */}
            <div className="text-right">
              <p className="text-2xl font-bold">
                Итого к оплате: {formatCurrency(calculateTotal())}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createInvoice.isPending}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={createInvoice.isPending}>
                {createInvoice.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Создать счет
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
