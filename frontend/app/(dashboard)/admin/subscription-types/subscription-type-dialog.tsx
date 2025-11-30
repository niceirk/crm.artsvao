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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateSubscriptionType,
  useUpdateSubscriptionType,
} from '@/hooks/use-subscription-types';
import { useGroups } from '@/hooks/use-groups';
import { Group } from '@/lib/api/groups';
import type { SubscriptionType } from '@/lib/types/subscriptions';

const formSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  groupId: z.string().min(1, 'Выберите группу'),
  type: z.enum(['UNLIMITED']),
  price: z.coerce.number().min(0, 'Цена должна быть положительной'),
  pricePerLesson: z.coerce.number().min(0, 'Цена за занятие не может быть отрицательной').optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface SubscriptionTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionType?: SubscriptionType;
  defaultGroupId?: string;
  studioId?: string;
  groupsList?: Group[];
  onSuccess?: (subscriptionType: SubscriptionType) => void;
}

export function SubscriptionTypeDialog({
  open,
  onOpenChange,
  subscriptionType,
  defaultGroupId,
  studioId,
  groupsList,
  onSuccess,
}: SubscriptionTypeDialogProps) {
  const createMutation = useCreateSubscriptionType();
  const updateMutation = useUpdateSubscriptionType();
  const { data: groups } = useGroups(
    groupsList ? undefined : studioId ? { studioId, limit: 200 } : undefined
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      groupId: '',
      type: 'UNLIMITED',
      price: 0,
      pricePerLesson: undefined,
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (subscriptionType) {
      form.reset({
        name: subscriptionType.name,
        groupId: subscriptionType.groupId,
        type: subscriptionType.type,
        price: subscriptionType.price,
        pricePerLesson: subscriptionType.pricePerLesson ?? undefined,
        description: subscriptionType.description || '',
        isActive: subscriptionType.isActive,
      });
    } else {
      form.reset({
        name: '',
        groupId: defaultGroupId || '',
        type: 'UNLIMITED',
        price: 0,
        pricePerLesson: undefined,
        description: '',
        isActive: true,
      });
    }
  }, [subscriptionType, form, open, defaultGroupId]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (subscriptionType) {
        const updated = await updateMutation.mutateAsync({ id: subscriptionType.id, data: values });
        onSuccess?.(updated);
      } else {
        const created = await createMutation.mutateAsync(values);
        onSuccess?.(created);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handling in hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {subscriptionType ? 'Редактировать' : 'Создать'} тип абонемента
          </DialogTitle>
          <DialogDescription>
            {subscriptionType
              ? 'Внесите изменения в тип абонемента'
              : 'Заполните информацию о новом типе абонемента'}
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
                    <Input placeholder="Абонемент на месяц..." {...field} />
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                    disabled={!!subscriptionType}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите группу" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(groupsList || groups?.data || []).map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                          {!groupsList && group.studio ? ` (${group.studio.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {subscriptionType && (
                    <FormDescription>
                      Группу нельзя изменить после создания типа абонемента
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип абонемента *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UNLIMITED">
                        Безлимитный (на месяц)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Неограниченное посещение в течение месяца
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
                    <FormLabel>Полная стоимость (₽) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="5000"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Стоимость на полный месяц
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
                    <FormLabel>Цена за занятие (₽)</FormLabel>
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
                      Для неполного месяца
                    </FormDescription>
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
                      placeholder="Дополнительная информация о типе абонемента..."
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
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Активен</FormLabel>
                    <FormDescription>
                      Тип доступен для продажи абонементов
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {subscriptionType ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
