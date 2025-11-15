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
import { Textarea } from '@/components/ui/textarea';
import { useCreateEventType, useUpdateEventType } from '@/hooks/use-event-types';
import { EventType } from '@/lib/api/event-types';

const formSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  description: z.string().optional(),
  color: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EventTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType?: EventType;
}

export function EventTypeDialog({ open, onOpenChange, eventType }: EventTypeDialogProps) {
  const createEventType = useCreateEventType();
  const updateEventType = useUpdateEventType();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#3b82f6', // blue-500
    },
  });

  useEffect(() => {
    if (eventType) {
      form.reset({
        name: eventType.name,
        description: eventType.description || '',
        color: eventType.color || '#3b82f6',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        color: '#3b82f6',
      });
    }
  }, [eventType, form, open]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (eventType) {
        await updateEventType.mutateAsync({ id: eventType.id, data: values });
      } else {
        await createEventType.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {eventType ? 'Редактировать тип мероприятия' : 'Создать тип мероприятия'}
          </DialogTitle>
          <DialogDescription>
            {eventType
              ? 'Внесите изменения в тип мероприятия'
              : 'Заполните информацию о новом типе мероприятия'}
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
                    <Input placeholder="Концерт, Выставка, Конференция..." {...field} />
                  </FormControl>
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
                      placeholder="Краткое описание типа мероприятия"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Опционально: поможет лучше понять назначение типа
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Цвет</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        {...field}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Цвет для отображения в календаре
                  </FormDescription>
                  <FormMessage />
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
                disabled={createEventType.isPending || updateEventType.isPending}
              >
                {eventType ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
