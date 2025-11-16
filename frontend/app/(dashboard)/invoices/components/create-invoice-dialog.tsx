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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useServices } from '@/hooks/use-services';
import { useCreateInvoice } from '@/hooks/use-invoices';
import type { CreateInvoiceDto, CreateInvoiceItemDto } from '@/lib/types/invoices';
import type { ServiceType, WriteOffTiming } from '@/lib/types/services';

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const invoiceItemSchema = z.object({
  serviceId: z.string().optional(),
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
  const { data: clients } = useClients();
  const { data: servicesResponse } = useServices();
  const createInvoice = useCreateInvoice();

  const services = servicesResponse?.data || [];

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

  const handleServiceSelect = (index: number, serviceId: string) => {
    const service = services?.find((s) => s.id === serviceId);
    if (service) {
      form.setValue(`items.${index}.serviceId`, service.id);
      form.setValue(`items.${index}.serviceName`, service.name);
      form.setValue(`items.${index}.serviceType`, service.serviceType);
      form.setValue(`items.${index}.basePrice`, Number(service.basePrice));
      form.setValue(`items.${index}.vatRate`, Number(service.vatRate));
      form.setValue(`items.${index}.writeOffTiming`, service.writeOffTiming);
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите клиента" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients?.data?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.lastName} {client.firstName} ({client.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                              {services?.map((service) => (
                                <SelectItem key={service.id} value={service.id}>
                                  {service.name}
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
                      <Input type="date" {...field} />
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
