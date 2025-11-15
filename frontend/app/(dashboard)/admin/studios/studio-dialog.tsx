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
import { useCreateStudio, useUpdateStudio } from '@/hooks/use-studios';
import { Studio } from '@/lib/api/studios';

const statusOptions = [
  { value: 'ACTIVE', label: 'Активна' },
  { value: 'INACTIVE', label: 'Неактивна' },
] as const;

const typeOptions = [
  { value: 'GROUP', label: 'Групповые' },
  { value: 'INDIVIDUAL', label: 'Индивидуальные' },
  { value: 'BOTH', label: 'Групповые и индивидуальные' },
] as const;

const formSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  description: z.string().optional(),
  type: z.enum(['GROUP', 'INDIVIDUAL', 'BOTH']),
  category: z.string().optional(),
  photoUrl: z.string().url('Введите корректный URL').optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface StudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studio?: Studio;
}

export function StudioDialog({ open, onOpenChange, studio }: StudioDialogProps) {
  const createStudio = useCreateStudio();
  const updateStudio = useUpdateStudio();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'GROUP',
      category: '',
      photoUrl: '',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (studio) {
      form.reset({
        name: studio.name,
        description: studio.description || '',
        type: studio.type,
        category: studio.category || '',
        photoUrl: studio.photoUrl || '',
        status: studio.status,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        type: 'GROUP',
        category: '',
        photoUrl: '',
        status: 'ACTIVE',
      });
    }
  }, [studio, form, open]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (studio) {
        await updateStudio.mutateAsync({ id: studio.id, data: values });
      } else {
        await createStudio.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {studio ? 'Редактировать студию' : 'Создать студию'}
          </DialogTitle>
          <DialogDescription>
            {studio
              ? 'Внесите изменения в данные студии'
              : 'Заполните информацию о новой студии'}
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
                    <Input placeholder="Танцевальная студия" {...field} />
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
                      placeholder="Краткое описание студии..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typeOptions.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Категория</FormLabel>
                    <FormControl>
                      <Input placeholder="Хореография, Вокал..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL фотографии</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/photo.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Статус</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите статус" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                disabled={createStudio.isPending || updateStudio.isPending}
              >
                {studio ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
