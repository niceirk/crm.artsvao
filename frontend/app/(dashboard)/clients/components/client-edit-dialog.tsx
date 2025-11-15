'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateClient } from '@/hooks/useClients';
import { useActiveLeadSources } from '@/hooks/useLeadSources';
import type { Client } from '@/lib/types/clients';

const clientSchema = z.object({
  firstName: z.string().min(1, 'Обязательное поле'),
  lastName: z.string().min(1, 'Обязательное поле'),
  middleName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  leadSourceId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'VIP']).optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientEditDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientEditDialog({ client, open, onOpenChange }: ClientEditDialogProps) {
  const updateClient = useUpdateClient();
  const { data: leadSources, isLoading: isLoadingLeadSources } = useActiveLeadSources();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

  const statusValue = watch('status');
  const leadSourceIdValue = watch('leadSourceId');

  useEffect(() => {
    if (client) {
      reset({
        firstName: client.firstName,
        lastName: client.lastName,
        middleName: client.middleName || '',
        phone: client.phone || '',
        email: client.email || '',
        dateOfBirth: client.dateOfBirth || '',
        address: client.address || '',
        notes: client.notes || '',
        leadSourceId: client.leadSourceId || undefined,
        status: client.status,
      });
    }
  }, [client, reset]);

  const onSubmit = (data: ClientFormData) => {
    // Очистить пустые значения
    const cleanedData = {
      ...data,
      leadSourceId: data.leadSourceId || undefined,
    };

    updateClient.mutate(
      { id: client.id, data: cleanedData },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать клиента</DialogTitle>
          <DialogDescription>
            Измените данные клиента
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lastName">Фамилия *</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.lastName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="firstName">Имя *</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="middleName">Отчество</Label>
            <Input id="middleName" {...register('middleName')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" type="tel" placeholder="+7 (999) 123-45-67" {...register('phone')} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateOfBirth">Дата рождения</Label>
              <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
            </div>
            <div>
              <Label htmlFor="status">Статус</Label>
              <Select value={statusValue} onValueChange={(value) => setValue('status', value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Активный</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="INACTIVE">Неактивный</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="leadSourceId">Источник привлечения</Label>
            <Select
              value={leadSourceIdValue}
              onValueChange={(value) => setValue('leadSourceId', value)}
              disabled={isLoadingLeadSources}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите источник" />
              </SelectTrigger>
              <SelectContent>
                {leadSources?.map((source) => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="address">Адрес</Label>
            <Input id="address" {...register('address')} />
          </div>

          <div>
            <Label htmlFor="notes">Примечания</Label>
            <Textarea id="notes" {...register('notes')} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={updateClient.isPending}>
              {updateClient.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
