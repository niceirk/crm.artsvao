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
import { useCreateRental, useUpdateRental } from '@/hooks/use-rentals';
import { useRooms } from '@/hooks/use-rooms';
import { Rental } from '@/lib/api/rentals';

const statusOptions = [
  { value: 'PLANNED', label: 'Запланировано' },
  { value: 'ONGOING', label: 'В процессе' },
  { value: 'COMPLETED', label: 'Завершено' },
  { value: 'CANCELLED', label: 'Отменено' },
] as const;

const formSchema = z.object({
  roomId: z.string().min(1, 'Выберите помещение'),
  clientName: z.string().min(1, 'Введите имя клиента'),
  clientPhone: z.string().min(1, 'Введите телефон'),
  clientEmail: z.string().email('Введите корректный email').optional().or(z.literal('')),
  eventType: z.string().min(1, 'Введите тип мероприятия'),
  date: z.string().min(1, 'Выберите дату'),
  startTime: z.string().min(1, 'Введите время начала'),
  endTime: z.string().min(1, 'Введите время окончания'),
  totalPrice: z.coerce.number().min(0, 'Цена должна быть больше 0'),
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RentalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental?: Rental;
  initialData?: { date: string; startTime: string; endTime: string } | null;
}

export function RentalDialog({ open, onOpenChange, rental, initialData }: RentalDialogProps) {
  const createRental = useCreateRental();
  const updateRental = useUpdateRental();
  const { data: rooms } = useRooms();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      eventType: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '18:00',
      totalPrice: 0,
      status: 'PLANNED',
      notes: '',
    },
  });

  useEffect(() => {
    if (rental) {
      // Extract time from datetime string
      const startTime = rental.startTime.includes('T')
        ? rental.startTime.split('T')[1].slice(0, 5)
        : rental.startTime.split(':').slice(0, 2).join(':');
      const endTime = rental.endTime.includes('T')
        ? rental.endTime.split('T')[1].slice(0, 5)
        : rental.endTime.split(':').slice(0, 2).join(':');

      // Extract date
      const date = rental.date.split('T')[0];

      form.reset({
        roomId: rental.roomId,
        clientName: rental.clientName,
        clientPhone: rental.clientPhone,
        clientEmail: rental.clientEmail || '',
        eventType: rental.eventType,
        date: date,
        startTime: startTime,
        endTime: endTime,
        totalPrice: Number(rental.totalPrice),
        status: rental.status,
        notes: rental.notes || '',
      });
    } else if (initialData) {
      form.reset({
        roomId: '',
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        eventType: '',
        date: initialData.date,
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        totalPrice: 0,
        status: 'PLANNED',
        notes: '',
      });
    } else {
      form.reset({
        roomId: '',
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        eventType: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '18:00',
        totalPrice: 0,
        status: 'PLANNED',
        notes: '',
      });
    }
  }, [rental, initialData, form, open]);

  const onSubmit = async (values: FormValues) => {
    try {
      const submitData = {
        ...values,
        clientEmail: values.clientEmail || undefined,
        notes: values.notes || undefined,
      };

      if (rental) {
        await updateRental.mutateAsync({ id: rental.id, data: submitData });
      } else {
        await createRental.mutateAsync(submitData);
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
            {rental ? 'Редактировать аренду' : 'Создать аренду'}
          </DialogTitle>
          <DialogDescription>
            {rental
              ? 'Внесите изменения в данные аренды'
              : 'Заполните информацию о новой аренде'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Помещение *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите помещение" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rooms?.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} {room.number ? `(${room.number})` : ''}
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
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя клиента *</FormLabel>
                    <FormControl>
                      <Input placeholder="Иванов Иван" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон *</FormLabel>
                    <FormControl>
                      <Input placeholder="+7 (999) 123-45-67" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип мероприятия *</FormLabel>
                    <FormControl>
                      <Input placeholder="День рождения, свадьба..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Время начала *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Время окончания *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Стоимость *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
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
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Заметки</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Дополнительная информация..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
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
                disabled={createRental.isPending || updateRental.isPending}
              >
                {rental ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
