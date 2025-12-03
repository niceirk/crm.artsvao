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
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateRoom, useUpdateRoom } from '@/hooks/use-rooms';
import { Room } from '@/lib/api/rooms';

const roomTypes = [
  { value: 'HALL', label: 'Зал' },
  { value: 'CLASS', label: 'Класс' },
  { value: 'STUDIO', label: 'Студия' },
  { value: 'CONFERENCE', label: 'Конференц-зал' },
] as const;

const formSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  number: z.string().optional(),
  capacity: z.number().min(1, 'Минимум 1 человек'),
  type: z.enum(['HALL', 'CLASS', 'STUDIO', 'CONFERENCE']),
  hourlyRate: z.number().min(0, 'Минимум 0'),
  dailyRate: z.number().min(0, 'Минимум 0').optional(),
  equipment: z.string().optional(),
  isCoworking: z.boolean().optional(),
  dailyRateCoworking: z.number().min(0, 'Минимум 0').optional(),
  monthlyRateCoworking: z.number().min(0, 'Минимум 0').optional(),
  sortOrder: z.number().int().min(0, 'Минимум 0').optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: Room;
}

export function RoomDialog({ open, onOpenChange, room }: RoomDialogProps) {
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      number: '',
      capacity: 10,
      type: 'CLASS',
      hourlyRate: 1000,
      dailyRate: 7000,
      equipment: '',
      isCoworking: false,
      dailyRateCoworking: undefined,
      monthlyRateCoworking: undefined,
      sortOrder: 0,
    },
  });

  useEffect(() => {
    if (room) {
      form.reset({
        name: room.name,
        number: room.number || '',
        capacity: room.capacity || 10,
        type: room.type,
        hourlyRate: Number(room.hourlyRate),
        dailyRate: room.dailyRate ? Number(room.dailyRate) : undefined,
        equipment: room.equipment || '',
        isCoworking: room.isCoworking || false,
        dailyRateCoworking: room.dailyRateCoworking ? Number(room.dailyRateCoworking) : undefined,
        monthlyRateCoworking: room.monthlyRateCoworking ? Number(room.monthlyRateCoworking) : undefined,
        sortOrder: room.sortOrder || 0,
      });
    } else {
      form.reset({
        name: '',
        number: '',
        capacity: 10,
        type: 'CLASS',
        hourlyRate: 1000,
        dailyRate: 7000,
        equipment: '',
        isCoworking: false,
        dailyRateCoworking: undefined,
        monthlyRateCoworking: undefined,
        sortOrder: 0,
      });
    }
  }, [room, form, open]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (room) {
        await updateRoom.mutateAsync({ id: room.id, data: values });
      } else {
        await createRoom.mutateAsync(values);
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
            {room ? 'Редактировать помещение' : 'Создать помещение'}
          </DialogTitle>
          <DialogDescription>
            {room
              ? 'Внесите изменения в данные помещения'
              : 'Заполните информацию о новом помещении'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название *</FormLabel>
                    <FormControl>
                      <Input placeholder="Большой зал" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер</FormLabel>
                    <FormControl>
                      <Input placeholder="101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                        {roomTypes.map((type) => (
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
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Вместимость *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="20"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 1)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>Человек</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Почасовая ставка *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1000"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>Рублей в час</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dailyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дневная ставка</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="7000"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>Рублей в день</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="equipment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Оборудование</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Проектор, звуковая система, микрофоны..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Порядок сортировки</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      value={field.value ?? 0}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>
                    Чем меньше число, тем выше помещение в списке (при включенной сортировке по индексу)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isCoworking"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Коворкинг</FormLabel>
                    <FormDescription>
                      Отметьте, если это помещение является коворкингом с рабочими местами для аренды
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch('isCoworking') && (
              <div className="grid grid-cols-2 gap-4 ml-7 p-4 border rounded-md bg-muted/50">
                <FormField
                  control={form.control}
                  name="dailyRateCoworking"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дневной тариф коворкинга</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1500"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>Рублей в день (без рабочих мест)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monthlyRateCoworking"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Месячный тариф коворкинга</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="20000"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>Рублей в месяц</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

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
                disabled={createRoom.isPending || updateRoom.isPending}
              >
                {room ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
