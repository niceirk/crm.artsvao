'use client';

import { useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateIndependentService,
  useUpdateIndependentService,
  useServiceCategories,
} from '@/hooks/use-nomenclature';
import type { NomenclatureItem } from '@/lib/types/nomenclature';

const formSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  description: z.string().optional(),
  price: z.number().min(0, 'Цена не может быть отрицательной'),
  vatRate: z.number().min(0).max(100).optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface IndependentServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: NomenclatureItem | null;
}

export function IndependentServiceDialog({
  open,
  onOpenChange,
  editItem,
}: IndependentServiceDialogProps) {
  const createMutation = useCreateIndependentService();
  const updateMutation = useUpdateIndependentService();
  const { data: categories } = useServiceCategories();

  const isEditing = !!editItem;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      vatRate: 0,
      categoryId: '',
      isActive: true,
    },
  });

  // Reset form when dialog opens/closes or editItem changes
  useEffect(() => {
    if (open) {
      if (editItem) {
        form.reset({
          name: editItem.name,
          description: editItem.description || '',
          price: editItem.price,
          vatRate: editItem.vatRate,
          categoryId: editItem.category?.id || '',
          isActive: editItem.isActive,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          price: 0,
          vatRate: 0,
          categoryId: '',
          isActive: true,
        });
      }
    }
  }, [open, editItem, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const data = {
        name: values.name,
        description: values.description || undefined,
        price: values.price,
        vatRate: values.vatRate,
        categoryId: values.categoryId || undefined,
        isActive: values.isActive,
      };

      if (isEditing && editItem) {
        await updateMutation.mutateAsync({
          id: editItem.id,
          data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      onOpenChange(false);
      form.reset();
    } catch {
      // Error handling in hooks
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редактировать услугу' : 'Создать услугу'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Измените параметры услуги'
              : 'Заполните информацию для новой услуги (копирование, печать и т.д.)'}
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
                    <Input placeholder="Например: Копирование А4" {...field} />
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
                  <FormLabel>Категория</FormLabel>
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Без категории</SelectItem>
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
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена (руб.) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
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
                    <FormLabel>Ставка НДС (%)</FormLabel>
                    <Select
                      value={String(field.value ?? 0)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите ставку" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Без НДС (0%)</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="20">20%</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Дополнительная информация об услуге"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="mb-0">Активна</FormLabel>
                    <FormDescription>
                      Неактивные услуги не отображаются при продаже
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
