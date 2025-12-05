'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { PhoneInput } from '@/components/ui/phone-input';
import { useCreateClient, useCheckDuplicate } from '@/hooks/useClients';
import { useActiveLeadSources } from '@/hooks/useLeadSources';
import { cleanPhoneNumber } from '@/lib/utils/phone';

const clientSchema = z.object({
  clientType: z.enum(['INDIVIDUAL', 'LEGAL_ENTITY']).optional(),
  firstName: z.string().min(1, 'Обязательное поле'),
  lastName: z.string().min(1, 'Обязательное поле'),
  middleName: z.string().optional(),
  companyName: z.string().optional(),
  inn: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  phoneAdditional: z.string().optional(),
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
    control,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

  const clientTypeValue = watch('clientType');
  const leadSourceIdValue = watch('leadSourceId');
  const phoneValue = watch('phone');

  // Проверка дубликатов по телефону
  const { data: duplicate } = useCheckDuplicate(phoneValue || '');

  const isLegalEntity = clientTypeValue === 'LEGAL_ENTITY';

  const onSubmit = (data: ClientFormData) => {
    // Очистить пустые значения и обработать телефоны
    const cleanedData = {
      ...data,
      phone: cleanPhoneNumber(data.phone) || undefined,
      phoneAdditional: cleanPhoneNumber(data.phoneAdditional) || undefined,
      leadSourceId: data.leadSourceId || undefined,
      email: data.email || undefined,
      middleName: data.middleName || undefined,
      companyName: data.companyName || undefined,
      inn: data.inn || undefined,
      dateOfBirth: data.dateOfBirth || undefined,
      address: data.address || undefined,
      notes: data.notes || undefined,
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
          {/* Тип клиента */}
          <div>
            <Label htmlFor="clientType">Тип клиента</Label>
            <Select
              value={clientTypeValue || 'INDIVIDUAL'}
              onValueChange={(value) => setValue('clientType', value as 'INDIVIDUAL' | 'LEGAL_ENTITY')}
            >
              <SelectTrigger id="clientType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">Физическое лицо</SelectItem>
                <SelectItem value="LEGAL_ENTITY">Юридическое лицо</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lastName">{isLegalEntity ? 'Контактное лицо (Фамилия) *' : 'Фамилия *'}</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.lastName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="firstName">{isLegalEntity ? 'Контактное лицо (Имя) *' : 'Имя *'}</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="middleName">{isLegalEntity ? 'Контактное лицо (Отчество)' : 'Отчество'}</Label>
            <Input id="middleName" {...register('middleName')} />
          </div>

          {/* Поля для юридического лица */}
          {isLegalEntity && (
            <>
              <div>
                <Label htmlFor="companyName">Название организации</Label>
                <Input id="companyName" {...register('companyName')} placeholder="ООО «Название»" />
              </div>
              <div>
                <Label htmlFor="inn">ИНН</Label>
                <Input id="inn" {...register('inn')} placeholder="1234567890" maxLength={12} />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    id="phone"
                    placeholder="+7 (999) 123-45-67"
                    {...field}
                  />
                )}
              />
              {duplicate && (
                <Alert variant="default" className="mt-2 border-amber-500 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Возможный дубликат</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Клиент с таким телефоном уже существует:{' '}
                    <Link
                      href={`/clients/${duplicate.id}`}
                      className="font-medium underline hover:no-underline"
                      onClick={() => onOpenChange(false)}
                    >
                      {duplicate.lastName} {duplicate.firstName}
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
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
              <DatePicker
                value={watch('dateOfBirth')}
                onChange={(date) => setValue('dateOfBirth', date || '')}
                maxDate={new Date()}
              />
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
            <Label htmlFor="phoneAdditional">Дополнительный телефон</Label>
            <Controller
              name="phoneAdditional"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  id="phoneAdditional"
                  placeholder="+7 (999) 123-45-67"
                  {...field}
                />
              )}
            />
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
