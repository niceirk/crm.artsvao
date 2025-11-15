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
import { useCreateTeacher, useUpdateTeacher } from '@/hooks/use-teachers';
import { Teacher } from '@/lib/api/teachers';

const statusOptions = [
  { value: 'ACTIVE', label: 'Активен' },
  { value: 'ON_LEAVE', label: 'В отпуске' },
  { value: 'RETIRED', label: 'Уволен' },
] as const;

const formSchema = z.object({
  firstName: z.string().min(1, 'Введите имя'),
  lastName: z.string().min(1, 'Введите фамилию'),
  middleName: z.string().optional(),
  phone: z.string().min(1, 'Введите телефон'),
  email: z.string().email('Введите корректный email').optional().or(z.literal('')),
  specialization: z.string().optional(),
  salaryPercentage: z.coerce.number().min(0, 'Минимум 0').max(100, 'Максимум 100'),
  photoUrl: z.string().url('Введите корректный URL').optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'RETIRED']).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher;
}

export function TeacherDialog({ open, onOpenChange, teacher }: TeacherDialogProps) {
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      middleName: '',
      phone: '',
      email: '',
      specialization: '',
      salaryPercentage: 50,
      photoUrl: '',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (teacher) {
      form.reset({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        middleName: teacher.middleName || '',
        phone: teacher.phone || '',
        email: teacher.email || '',
        specialization: teacher.specialization || '',
        salaryPercentage: teacher.salaryPercentage || 50,
        photoUrl: teacher.photoUrl || '',
        status: teacher.status,
      });
    } else {
      form.reset({
        firstName: '',
        lastName: '',
        middleName: '',
        phone: '',
        email: '',
        specialization: '',
        salaryPercentage: 50,
        photoUrl: '',
        status: 'ACTIVE',
      });
    }
  }, [teacher, form, open]);

  const onSubmit = async (values: FormValues) => {
    try {
      // Clean up empty strings for optional fields
      const submitData = {
        ...values,
        middleName: values.middleName || undefined,
        email: values.email || undefined,
        specialization: values.specialization || undefined,
        photoUrl: values.photoUrl || undefined,
      };

      if (teacher) {
        await updateTeacher.mutateAsync({ id: teacher.id, data: submitData });
      } else {
        await createTeacher.mutateAsync(submitData);
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
            {teacher ? 'Редактировать преподавателя' : 'Создать преподавателя'}
          </DialogTitle>
          <DialogDescription>
            {teacher
              ? 'Внесите изменения в данные преподавателя'
              : 'Заполните информацию о новом преподавателе'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Фамилия *</FormLabel>
                    <FormControl>
                      <Input placeholder="Иванов" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя *</FormLabel>
                    <FormControl>
                      <Input placeholder="Иван" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="middleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Отчество</FormLabel>
                  <FormControl>
                    <Input placeholder="Иванович" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон *</FormLabel>
                    <FormControl>
                      <Input placeholder="+7 (900) 123-45-67" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="teacher@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="specialization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Специализация</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Вокал, хореография..."
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
                name="salaryPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Процент от оплаты *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>От 0 до 100%</FormDescription>
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
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL фотографии</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/photo.jpg"
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
                disabled={createTeacher.isPending || updateTeacher.isPending}
              >
                {teacher ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
