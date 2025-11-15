'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateClient } from '@/hooks/useClients';
import { useActiveLeadSources } from '@/hooks/useLeadSources';

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
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientCreateDialog({ open, onOpenChange }: ClientCreateDialogProps) {
  const createClient = useCreateClient();
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

  const leadSourceIdValue = watch('leadSourceId');

  const onSubmit = (data: ClientFormData) => {
    // Очистить пустые значения
    const cleanedData = {
      ...data,
      leadSourceId: data.leadSourceId || undefined,
    };

    createClient.mutate(cleanedData, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать клиента</DialogTitle>
          <DialogDescription>
            Добавьте нового клиента в систему
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
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
