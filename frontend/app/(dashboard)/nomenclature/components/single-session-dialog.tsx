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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useUpdateSingleSession,
  useServiceCategories,
} from '@/hooks/use-nomenclature';
import type { NomenclatureItem } from '@/lib/types/nomenclature';

const formSchema = z.object({
  singleSessionPrice: z.number().min(0, 'Цена не может быть отрицательной'),
  singleSessionVatRate: z.number().min(0).max(100).optional(),
  serviceCategoryId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SingleSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: NomenclatureItem | null;
}

export function SingleSessionDialog({
  open,
  onOpenChange,
  editItem,
}: SingleSessionDialogProps) {
  const updateMutation = useUpdateSingleSession();
  const { data: categories } = useServiceCategories();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      singleSessionPrice: 0,
      singleSessionVatRate: 0,
      serviceCategoryId: '',
    },
  });

  // Reset form when dialog opens/closes or editItem changes
  useEffect(() => {
    if (open && editItem) {
      form.reset({
        singleSessionPrice: editItem.price,
        singleSessionVatRate: editItem.vatRate,
        serviceCategoryId: editItem.category?.id || '',
      });
    }
  }, [open, editItem, form]);

  // Получаем реальный groupId из id элемента (формат: "single-{groupId}")
  const getGroupId = () => {
    if (!editItem) return '';
    return editItem.id.replace('single-', '');
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const groupId = getGroupId();
      if (!groupId) return;

      await updateMutation.mutateAsync({
        groupId,
        singleSessionPrice: values.singleSessionPrice,
        singleSessionVatRate: values.singleSessionVatRate,
        serviceCategoryId: values.serviceCategoryId || undefined,
      });
      onOpenChange(false);
      form.reset();
    } catch {
      // Error handling in hooks
    }
  };

  if (!editItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Редактировать разовое посещение</DialogTitle>
          <DialogDescription>
            Измените параметры разового посещения для группы{' '}
            <span className="font-medium">{editItem.group?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Информация о группе (только для чтения) */}
            <div className="rounded-md border p-3 bg-muted/50">
              <div className="text-sm text-muted-foreground">Группа</div>
              <div className="font-medium">{editItem.group?.name}</div>
              <div className="text-sm text-muted-foreground">
                {editItem.group?.studio.name}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="singleSessionPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена разового (руб.) *</FormLabel>
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
                name="singleSessionVatRate"
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
              name="serviceCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Категория услуги</FormLabel>
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
                          {cat.name} (НДС {cat.defaultVatRate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Категория определяет ставку НДС по умолчанию
                  </FormDescription>
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
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
