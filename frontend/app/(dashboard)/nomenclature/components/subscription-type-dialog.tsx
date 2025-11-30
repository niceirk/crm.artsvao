'use client';

import { useEffect, useState } from 'react';
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
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  useCreateSubscriptionTypeNomenclature,
  useUpdateSubscriptionTypeNomenclature,
} from '@/hooks/use-nomenclature';
import { useGroups } from '@/hooks/use-groups';
import type { NomenclatureItem } from '@/lib/types/nomenclature';

const formSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  description: z.string().optional(),
  groupId: z.string().min(1, 'Выберите группу'),
  price: z.coerce.number().min(0, 'Цена не может быть отрицательной'),
  pricePerLesson: z.coerce.number().min(0, 'Цена за занятие не может быть отрицательной').optional(),
  vatRate: z.coerce.number().min(0).max(100).optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubscriptionTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: NomenclatureItem | null;
}

export function SubscriptionTypeDialog({
  open,
  onOpenChange,
  editItem,
}: SubscriptionTypeDialogProps) {
  const createMutation = useCreateSubscriptionTypeNomenclature();
  const updateMutation = useUpdateSubscriptionTypeNomenclature();
  const { data: groupsData } = useGroups({ limit: 1000 });
  const [groupSearch, setGroupSearch] = useState('');

  const isEditing = !!editItem;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      groupId: '',
      price: 0,
      pricePerLesson: undefined,
      vatRate: 0,
      isActive: true,
    },
  });

  // Reset form when dialog opens/closes or editItem changes
  useEffect(() => {
    if (open) {
      if (editItem) {
        form.reset({
          name: editItem.name.replace(/^Абонемент.*?-\s*/, ''),
          description: editItem.description || '',
          groupId: editItem.group?.id || '',
          price: editItem.price,
          pricePerLesson: editItem.pricePerLesson ?? undefined,
          vatRate: editItem.vatRate,
          isActive: editItem.isActive,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          groupId: '',
          price: 0,
          pricePerLesson: undefined,
          vatRate: 0,
          isActive: true,
        });
      }
      setGroupSearch('');
    }
  }, [open, editItem, form]);

  const groups = groupsData?.data ?? [];
  const normalizedSearch = groupSearch.trim().toLowerCase();
  const filteredGroups = groups.filter((group) => {
    const label = `${group.name} ${group.studio?.name ?? ''}`.toLowerCase();
    return label.includes(normalizedSearch);
  });

  const groupOptions: ComboboxOption[] = filteredGroups.map((group) => ({
    value: group.id,
    label: `${group.name} (${group.studio?.name ?? '-'})`,
  }));

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && editItem) {
        await updateMutation.mutateAsync({
          id: editItem.id,
          data: {
            version: editItem.version,
            name: values.name,
            description: values.description,
            groupId: values.groupId,
            price: values.price,
            pricePerLesson: values.pricePerLesson,
            vatRate: values.vatRate,
            isActive: values.isActive,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          description: values.description,
          groupId: values.groupId,
          price: values.price,
          pricePerLesson: values.pricePerLesson,
          vatRate: values.vatRate,
          isActive: values.isActive,
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
            {isEditing ? 'Редактировать тип абонемента' : 'Создать тип абонемента'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Измените параметры типа абонемента'
              : 'Заполните информацию для нового типа абонемента'}
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
                    <Input placeholder="Например: Безлимитный на месяц" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    disabled={isEditing}
                  />
                  <FormDescription>
                    {isEditing && 'Группу нельзя изменить после создания'}
                  </FormDescription>
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
                    <FormLabel>Полная стоимость (руб.) *</FormLabel>
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
                    <FormDescription>
                      Стоимость при покупке на полный месяц
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pricePerLesson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена за занятие (руб.)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Для расчёта при неполном месяце
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Дополнительная информация об абонементе"
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
                    <FormLabel className="mb-0">Активен</FormLabel>
                    <FormDescription>
                      Неактивные типы абонементов не отображаются при продаже
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
