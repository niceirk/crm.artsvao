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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateServiceCategory,
  useUpdateServiceCategory,
} from '@/hooks/use-nomenclature';
import type { ServiceCategory } from '@/lib/types/nomenclature';

const formSchema = z.object({
  name: z.string().min(1, 'Введите название категории'),
  description: z.string().optional(),
  defaultVatRate: z.coerce.number().min(0).max(100),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCategory?: ServiceCategory | null;
}

export function ServiceCategoryDialog({
  open,
  onOpenChange,
  editCategory,
}: ServiceCategoryDialogProps) {
  const createMutation = useCreateServiceCategory();
  const updateMutation = useUpdateServiceCategory();

  const isEditing = !!editCategory;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      defaultVatRate: 0,
    },
  });

  // Reset form when dialog opens/closes or editCategory changes
  useEffect(() => {
    if (open) {
      if (editCategory) {
        form.reset({
          name: editCategory.name,
          description: editCategory.description || '',
          defaultVatRate: editCategory.defaultVatRate,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          defaultVatRate: 0,
        });
      }
    }
  }, [open, editCategory, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && editCategory) {
        await updateMutation.mutateAsync({
          id: editCategory.id,
          data: {
            name: values.name,
            description: values.description,
            defaultVatRate: values.defaultVatRate,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          description: values.description,
          defaultVatRate: values.defaultVatRate,
        });
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
            {isEditing ? 'Редактировать категорию' : 'Создать категорию услуг'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Измените параметры категории услуг'
              : 'Заполните информацию для новой категории'}
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
                    <Input placeholder="Например: Танцы" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultVatRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ставка НДС по умолчанию (%)</FormLabel>
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
                  <FormDescription>
                    Эта ставка будет применяться ко всем услугам категории по умолчанию
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
                    <Textarea
                      placeholder="Дополнительная информация о категории"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
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
