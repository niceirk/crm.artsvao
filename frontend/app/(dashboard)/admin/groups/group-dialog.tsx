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
import { Switch } from '@/components/ui/switch';
import { useCreateGroup, useUpdateGroup } from '@/hooks/use-groups';
import { useStudios } from '@/hooks/use-studios';
import { useTeachers } from '@/hooks/use-teachers';
import { useRooms } from '@/hooks/use-rooms';
import { Group } from '@/lib/api/groups';

const statusOptions = [
  { value: 'ACTIVE', label: 'Активна' },
  { value: 'INACTIVE', label: 'Неактивна' },
  { value: 'ARCHIVED', label: 'Архив' },
] as const;

const formSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  maxParticipants: z.number().min(1, 'Минимум 1 участник'),
  singleSessionPrice: z.number().min(0, 'Минимум 0'),
  ageMin: z.number().min(0, 'Минимум 0').optional(),
  ageMax: z.number().min(0, 'Минимум 0').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  studioId: z.string().min(1, 'Выберите студию'),
  teacherId: z.string().min(1, 'Выберите преподавателя'),
  roomId: z.string().optional(),
  isPaid: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: Group;
  defaultStudioId?: string;
  disableStudioSelect?: boolean;
  onSuccess?: (group: Group) => void;
}

export function GroupDialog({
  open,
  onOpenChange,
  group,
  defaultStudioId,
  disableStudioSelect,
  onSuccess,
}: GroupDialogProps) {
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const { data: studios } = useStudios();
  const { data: teachers } = useTeachers();
  const { data: rooms } = useRooms();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      maxParticipants: 15,
      singleSessionPrice: 500,
      ageMin: undefined,
      ageMax: undefined,
      status: 'ACTIVE',
      studioId: '',
      teacherId: '',
      roomId: '',
      isPaid: true,
    },
  });

  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name,
        maxParticipants: group.maxParticipants,
        singleSessionPrice: Number(group.singleSessionPrice),
        ageMin: group.ageMin || undefined,
        ageMax: group.ageMax || undefined,
        status: group.status,
        studioId: group.studioId,
        teacherId: group.teacherId,
        roomId: group.roomId || '',
        isPaid: group.isPaid ?? true,
      });
    } else {
      form.reset({
        name: '',
        maxParticipants: 15,
        singleSessionPrice: 500,
        ageMin: undefined,
        ageMax: undefined,
        status: 'ACTIVE',
        studioId: defaultStudioId || '',
        teacherId: '',
        roomId: '',
        isPaid: true,
      });
    }
  }, [group, form, open, defaultStudioId]);

  const onSubmit = async (values: FormValues) => {
    try {
      // Remove empty roomId (convert __none__ to undefined)
      const submitData = {
        ...values,
        roomId: values.roomId && values.roomId !== '__none__' ? values.roomId : undefined,
      };

      if (group) {
        const updated = await updateGroup.mutateAsync({ id: group.id, data: { ...submitData, version: group.version } });
        onSuccess?.(updated);
      } else {
        const created = await createGroup.mutateAsync(submitData);
        onSuccess?.(created);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const getTeacherFullName = (teacher: any) => {
    return [teacher.lastName, teacher.firstName, teacher.middleName]
      .filter(Boolean)
      .join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {group ? 'Редактировать группу' : 'Создать группу'}
          </DialogTitle>
          <DialogDescription>
            {group
              ? 'Внесите изменения в данные группы'
              : 'Заполните информацию о новой группе'}
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
                    <Input placeholder="Младшая группа хореографии" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="studioId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Студия *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={disableStudioSelect}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите студию" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {studios?.map((studio) => (
                          <SelectItem key={studio.id} value={studio.id}>
                            {studio.name}
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
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Преподаватель *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите преподавателя" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teachers?.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {getTeacherFullName(teacher)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Макс. участников *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="15"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 1)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="singleSessionPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена занятия *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="500"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>Рублей за одно занятие</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ageMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Минимальный возраст</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="5"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>Лет</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ageMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Максимальный возраст</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="18"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>Лет</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Помещение (по умолчанию)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                    value={field.value || '__none__'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Не выбрано" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Не выбрано</SelectItem>
                      {rooms?.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} {room.number ? `(${room.number})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Можно указать позже в расписании</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="isPaid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Платная группа</FormLabel>
                      <FormDescription>
                        Требуется оплата для участия
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
                disabled={createGroup.isPending || updateGroup.isPending}
              >
                {group ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
