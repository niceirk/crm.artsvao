'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { PhoneInput } from '@/components/ui/phone-input';
import { Calendar, User, Phone, Mail, FileText } from 'lucide-react';
import type { Client } from '@/lib/types/clients';
import { useUpdateClient } from '@/hooks/useClients';
import { useActiveLeadSources } from '@/hooks/useLeadSources';
import { useActiveBenefitCategories } from '@/hooks/useBenefitCategories';
import { ClientDocumentsCard } from './client-documents-card';
import { cleanPhoneNumber } from '@/lib/utils/phone';

interface ClientInfoCardProps {
  client: Client;
  isEditing: boolean;
  onRefresh?: () => void;
  onSaveSuccess: () => void;
  onCancel: () => void;
  onSaveRequest?: (saveFunction: () => void) => void;
}

const genderLabels: Record<string, string> = {
  MALE: 'Мужской',
  FEMALE: 'Женский',
  OTHER: 'Другой',
};

const clientTypeLabels: Record<string, string> = {
  INDIVIDUAL: 'Физическое лицо',
  LEGAL_ENTITY: 'Юридическое лицо',
};

const clientSchema = z.object({
  clientType: z.enum(['INDIVIDUAL', 'LEGAL_ENTITY']),
  firstName: z.string().min(1, 'Обязательное поле'),
  lastName: z.string().min(1, 'Обязательное поле'),
  middleName: z.string().optional(),
  companyName: z.string().optional(),
  inn: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  snils: z.string().optional(),
  phone: z.string().min(1, 'Обязательное поле'),
  phoneAdditional: z.string().optional(),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  notes: z.string().optional(),
  leadSourceId: z.string().optional(),
  benefitCategoryId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'VIP']),
});

type ClientFormData = z.infer<typeof clientSchema>;

export function ClientInfoCard({ client, isEditing, onRefresh, onSaveSuccess, onCancel, onSaveRequest }: ClientInfoCardProps) {
  const updateClient = useUpdateClient();
  const { data: leadSources } = useActiveLeadSources();
  const { data: benefitCategories } = useActiveBenefitCategories();

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
    defaultValues: {
      clientType: client.clientType,
      firstName: client.firstName,
      lastName: client.lastName,
      middleName: client.middleName || '',
      companyName: client.companyName || '',
      inn: client.inn || '',
      gender: client.gender || '',
      dateOfBirth: client.dateOfBirth || '',
      address: client.address || '',
      snils: client.snils || '',
      phone: client.phone || '',
      phoneAdditional: client.phoneAdditional || '',
      email: client.email || '',
      notes: client.notes || '',
      leadSourceId: client.leadSourceId || '',
      benefitCategoryId: client.benefitCategoryId || '',
      status: client.status,
    },
  });

  // Обработчик Ctrl+S для сохранения
  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, handleSubmit]);

  const clientTypeValue = watch('clientType');
  const statusValue = watch('status');
  const genderValue = watch('gender');
  const leadSourceIdValue = watch('leadSourceId');
  const benefitCategoryIdValue = watch('benefitCategoryId');

  // Сбрасываем форму при изменении клиента или выходе из режима редактирования
  useEffect(() => {
    if (!isEditing) {
      reset({
        clientType: client.clientType,
        firstName: client.firstName,
        lastName: client.lastName,
        middleName: client.middleName || '',
        companyName: client.companyName || '',
        inn: client.inn || '',
        gender: client.gender || '',
        dateOfBirth: client.dateOfBirth || '',
        address: client.address || '',
        snils: client.snils || '',
        phone: client.phone || '',
        phoneAdditional: client.phoneAdditional || '',
        email: client.email || '',
        notes: client.notes || '',
        leadSourceId: client.leadSourceId || '',
        benefitCategoryId: client.benefitCategoryId || '',
        status: client.status,
      });
    }
  }, [client, isEditing, reset]);

  // Передаем функцию сохранения в родительский компонент
  useEffect(() => {
    if (isEditing && onSaveRequest) {
      const submitForm = () => handleSubmit(onSubmit)();
      onSaveRequest(submitForm);
    }
  }, [isEditing]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const calculateAge = (dateOfBirth: string | null | undefined) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDateOfBirth = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    const age = calculateAge(dateString);
    return `${formatDate(dateString)}${age ? ` (${age} лет)` : ''}`;
  };

  const onSubmit = async (data: ClientFormData) => {
    try {
      await updateClient.mutateAsync({
        id: client.id,
        data: {
          ...data,
          phone: cleanPhoneNumber(data.phone) || data.phone,
          phoneAdditional: cleanPhoneNumber(data.phoneAdditional) || null,
          middleName: data.middleName || null,
          companyName: data.companyName || null,
          inn: data.inn || null,
          gender: data.gender || null,
          dateOfBirth: data.dateOfBirth || null,
          address: data.address || null,
          snils: data.snils || null,
          email: data.email || null,
          notes: data.notes || null,
          leadSourceId: data.leadSourceId || null,
          benefitCategoryId: data.benefitCategoryId || null,
        },
      });
      onRefresh?.();
      onSaveSuccess();
    } catch (error) {
      // Ошибка обрабатывается в хуке
    }
  };

  const isLegalEntity = clientTypeValue === 'LEGAL_ENTITY';

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Основная информация
          </CardTitle>
          <CardDescription>
            Редактирование данных клиента (Ctrl+S для сохранения)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Тип клиента */}
            <div>
              <Label htmlFor="clientType" className="flex items-center gap-1">
                Тип клиента
                <span className="text-yellow-600">*</span>
              </Label>
              <Select
                value={clientTypeValue}
                onValueChange={(value) => setValue('clientType', value as any)}
              >
                <SelectTrigger id="clientType" className="bg-yellow-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">Физическое лицо</SelectItem>
                  <SelectItem value="LEGAL_ENTITY">Юридическое лицо</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Поля для юр. лица */}
            {isLegalEntity && (
              <>
                <div>
                  <Label htmlFor="companyName">Название организации</Label>
                  <Input id="companyName" {...register('companyName')} placeholder="ООО «Название»" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inn">ИНН</Label>
                    <Input id="inn" {...register('inn')} placeholder="1234567890" maxLength={12} />
                  </div>
                </div>
              </>
            )}

            {/* ФИО на одной строке */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="lastName" className="flex items-center gap-1">
                  {isLegalEntity ? 'Контакт (Фамилия)' : 'Фамилия'}
                  <span className="text-yellow-600">*</span>
                </Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  className={errors.lastName ? 'border-destructive bg-yellow-50' : 'bg-yellow-50'}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="firstName" className="flex items-center gap-1">
                  {isLegalEntity ? 'Контакт (Имя)' : 'Имя'}
                  <span className="text-yellow-600">*</span>
                </Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  className={errors.firstName ? 'border-destructive bg-yellow-50' : 'bg-yellow-50'}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="middleName">{isLegalEntity ? 'Контакт (Отчество)' : 'Отчество'}</Label>
                <Input id="middleName" {...register('middleName')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender">Пол</Label>
                <Select value={genderValue || 'NONE'} onValueChange={(value) => setValue('gender', value === 'NONE' ? '' : value)}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Не указан" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Не указан</SelectItem>
                    <SelectItem value="MALE">Мужской</SelectItem>
                    <SelectItem value="FEMALE">Женский</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Дата рождения</Label>
                <DatePicker
                  value={watch('dateOfBirth')}
                  onChange={(date) => setValue('dateOfBirth', date || '')}
                  maxDate={new Date()}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Адрес</Label>
              <Input id="address" {...register('address')} />
            </div>

            {!isLegalEntity && (
              <div>
                <Label htmlFor="snils">СНИЛС</Label>
                <Input id="snils" {...register('snils')} placeholder="000-000-000 00" />
              </div>
            )}

            {/* Контактная информация */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Контактная информация
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-1">
                    Телефон
                    <span className="text-yellow-600">*</span>
                  </Label>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <PhoneInput
                        id="phone"
                        placeholder="+7 (999) 123-45-67"
                        {...field}
                        className={errors.phone ? 'border-destructive bg-yellow-50' : 'bg-yellow-50'}
                      />
                    )}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
                  )}
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
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status" className="flex items-center gap-1">
                  Статус
                  <span className="text-yellow-600">*</span>
                </Label>
                <Select value={statusValue} onValueChange={(value) => setValue('status', value as any)}>
                  <SelectTrigger id="status" className="bg-yellow-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Активный</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="INACTIVE">Неактивный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="leadSourceId">Источник привлечения</Label>
                <Select value={leadSourceIdValue || 'NONE'} onValueChange={(value) => setValue('leadSourceId', value === 'NONE' ? '' : value)}>
                  <SelectTrigger id="leadSourceId">
                    <SelectValue placeholder="Не указан" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Не указан</SelectItem>
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
              <Label htmlFor="benefitCategoryId">Льготная категория</Label>
              <Select value={benefitCategoryIdValue || 'NONE'} onValueChange={(value) => setValue('benefitCategoryId', value === 'NONE' ? '' : value)}>
                <SelectTrigger id="benefitCategoryId">
                  <SelectValue placeholder="Не указана" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Не указана</SelectItem>
                  {benefitCategories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} ({category.discountPercent}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Заметки</Label>
              <Textarea id="notes" {...register('notes')} rows={4} />
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Режим просмотра
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Основная информация
        </CardTitle>
        <CardDescription>
          Личные данные клиента
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label className="text-muted-foreground">Тип клиента</Label>
            <p className="text-sm font-medium">{clientTypeLabels[client.clientType]}</p>
          </div>

          {client.clientType === 'LEGAL_ENTITY' && (
            <>
              {client.companyName && (
                <div>
                  <Label className="text-muted-foreground">Название организации</Label>
                  <p className="text-sm font-medium">{client.companyName}</p>
                </div>
              )}
              {client.inn && (
                <div>
                  <Label className="text-muted-foreground">ИНН</Label>
                  <p className="text-sm font-medium">{client.inn}</p>
                </div>
              )}
            </>
          )}

          <div>
            <Label className="text-muted-foreground">
              {client.clientType === 'LEGAL_ENTITY' ? 'Контактное лицо' : 'ФИО'}
            </Label>
            <p className="text-sm font-medium">
              {[client.lastName, client.firstName, client.middleName].filter(Boolean).join(' ')}
            </p>
          </div>

          {client.gender && (
            <div>
              <Label className="text-muted-foreground">Пол</Label>
              <p className="text-sm font-medium">{genderLabels[client.gender]}</p>
            </div>
          )}

          {client.dateOfBirth && (
            <div>
              <Label className="text-muted-foreground">Дата рождения</Label>
              <p className="text-sm font-medium">{formatDateOfBirth(client.dateOfBirth)}</p>
            </div>
          )}

          {client.address && (
            <div>
              <Label className="text-muted-foreground">Адрес</Label>
              <p className="text-sm font-medium">{client.address}</p>
            </div>
          )}

          {client.clientType === 'INDIVIDUAL' && client.snils && (
            <div>
              <Label className="text-muted-foreground">СНИЛС</Label>
              <p className="text-sm font-medium">{client.snils}</p>
            </div>
          )}
        </div>

        {/* Контактная информация */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Контактная информация
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-muted-foreground">Телефон</Label>
                <p className="text-sm font-medium">{client.phone || '—'}</p>
              </div>
              {client.phone && (
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <a href={`tel:${client.phone}`}>Позвонить</a>
                </Button>
              )}
            </div>

            {client.phoneAdditional && (
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <Label className="text-muted-foreground">Дополнительный телефон</Label>
                  <p className="text-sm font-medium">{client.phoneAdditional}</p>
                </div>
              </div>
            )}

            {client.email && (
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium">{client.email}</p>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <a href={`mailto:${client.email}`}>Написать</a>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Статус и источник */}
        {(client.status || client.leadSourceId || client.benefitCategoryId) && (
          <div className="pt-4 border-t space-y-3">
            {client.status && (
              <div>
                <Label className="text-muted-foreground">Статус</Label>
                <p className="text-sm font-medium">
                  {client.status === 'ACTIVE' ? 'Активный' : client.status === 'VIP' ? 'VIP' : 'Неактивный'}
                </p>
              </div>
            )}
            {client.leadSource && (
              <div>
                <Label className="text-muted-foreground">Источник привлечения</Label>
                <p className="text-sm font-medium">{client.leadSource.name}</p>
              </div>
            )}
            {client.benefitCategory && (
              <div>
                <Label className="text-muted-foreground">Льготная категория</Label>
                <p className="text-sm font-medium">
                  {client.benefitCategory.name} ({client.benefitCategory.discountPercent}%)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Документы */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Документы ({client.documents?.length || 0})
          </h3>
          <ClientDocumentsCard client={client} onRefresh={onRefresh} embedded />
        </div>

        {/* Заметки */}
        {client.notes && (
          <div className="pt-4 border-t">
            <Label className="text-muted-foreground">Заметки</Label>
            <p className="text-sm font-medium whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}

        <div className="pt-4 border-t grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Создан:</span> {formatDate(client.createdAt)}
          </div>
          <div>
            <span className="font-medium">Обновлен:</span> {formatDate(client.updatedAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
