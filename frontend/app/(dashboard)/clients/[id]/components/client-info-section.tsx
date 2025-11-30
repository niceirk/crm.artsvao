'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { PhoneInput } from '@/components/ui/phone-input';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { User, Phone, Mail, Send, Unlink } from 'lucide-react';
import { CallButton } from '@/components/click-to-call/call-button';
import type { Client, TelegramAccount } from '@/lib/types/clients';
import { useUpdateClient } from '@/hooks/useClients';
import { useActiveLeadSources } from '@/hooks/useLeadSources';
import { useActiveBenefitCategories } from '@/hooks/useBenefitCategories';
import { cleanPhoneNumber } from '@/lib/utils/phone';
import { unlinkTelegramAccount, toggleTelegramNotifications } from '@/lib/api/clients';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ClientInfoSectionProps {
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

export function ClientInfoSection({ client, isEditing, onRefresh, onSaveSuccess, onCancel, onSaveRequest }: ClientInfoSectionProps) {
  const updateClient = useUpdateClient();
  const { data: leadSources } = useActiveLeadSources();
  const { data: benefitCategories } = useActiveBenefitCategories();
  const router = useRouter();
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [accountToUnlink, setAccountToUnlink] = useState<TelegramAccount | null>(null);

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

  const handleUnlinkAccount = (account: TelegramAccount) => {
    setAccountToUnlink(account);
    setUnlinkDialogOpen(true);
  };

  const confirmUnlink = async () => {
    if (!accountToUnlink) return;

    try {
      await unlinkTelegramAccount(client.id, accountToUnlink.id);
      toast.success('Telegram аккаунт отвязан');
      setUnlinkDialogOpen(false);
      setAccountToUnlink(null);
      onRefresh?.();
    } catch (error: any) {
      console.error('Unlink account error:', error);
      const errorMessage = error?.response?.data?.message || 'Ошибка при отвязке аккаунта';
      toast.error(errorMessage);
    }
  };

  const handleToggleNotifications = async (account: TelegramAccount, enabled: boolean) => {
    try {
      await toggleTelegramNotifications(client.id, account.id, enabled);
      toast.success(enabled ? 'Уведомления включены' : 'Уведомления отключены');
      onRefresh?.();
    } catch (error: any) {
      console.error('Toggle notifications error:', error);
      const errorMessage = error?.response?.data?.message || 'Ошибка при изменении настроек уведомлений';
      toast.error(errorMessage);
    }
  };

  const handleWriteToTelegram = (account: TelegramAccount) => {
    const conversation = account.conversations?.find(c => c.status === 'OPEN');
    if (conversation) {
      router.push(`/messages/${conversation.id}`);
    } else {
      toast.error('Нет активного диалога с этим клиентом');
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    try {
      await updateClient.mutateAsync({
        id: client.id,
        data: {
          ...data,
          version: client.version, // Для оптимистичной блокировки
          phone: cleanPhoneNumber(data.phone) || data.phone,
          phoneAdditional: cleanPhoneNumber(data.phoneAdditional) || undefined,
          middleName: data.middleName || undefined,
          companyName: data.companyName || undefined,
          inn: data.inn || undefined,
          gender: (data.gender as 'MALE' | 'FEMALE' | undefined) || undefined,
          dateOfBirth: data.dateOfBirth || undefined,
          address: data.address || undefined,
          snils: data.snils || undefined,
          email: data.email || undefined,
          notes: data.notes || undefined,
          leadSourceId: data.leadSourceId || undefined,
          benefitCategoryId: data.benefitCategoryId || undefined,
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
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <User className="h-4 w-4" />
          Основная информация
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Тип клиента */}
          <div>
            <Label htmlFor="clientType" className="flex items-center gap-1 text-xs">
              Тип клиента
              <span className="text-yellow-600">*</span>
            </Label>
            <Select
              value={clientTypeValue}
              onValueChange={(value) => setValue('clientType', value as 'INDIVIDUAL' | 'LEGAL_ENTITY')}
            >
              <SelectTrigger id="clientType" className="bg-yellow-50 h-9">
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
                <Label htmlFor="companyName" className="text-xs">Название организации</Label>
                <Input id="companyName" {...register('companyName')} placeholder="ООО «Название»" className="h-9" />
              </div>
              <div>
                <Label htmlFor="inn" className="text-xs">ИНН</Label>
                <Input id="inn" {...register('inn')} placeholder="1234567890" maxLength={12} className="h-9" />
              </div>
            </>
          )}

          {/* ФИО */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="lastName" className="flex items-center gap-1 text-xs">
                Фамилия
                <span className="text-yellow-600">*</span>
              </Label>
              <Input
                id="lastName"
                {...register('lastName')}
                className={`h-9 ${errors.lastName ? 'border-destructive bg-yellow-50' : 'bg-yellow-50'}`}
              />
            </div>
            <div>
              <Label htmlFor="firstName" className="flex items-center gap-1 text-xs">
                Имя
                <span className="text-yellow-600">*</span>
              </Label>
              <Input
                id="firstName"
                {...register('firstName')}
                className={`h-9 ${errors.firstName ? 'border-destructive bg-yellow-50' : 'bg-yellow-50'}`}
              />
            </div>
            <div>
              <Label htmlFor="middleName" className="text-xs">Отчество</Label>
              <Input id="middleName" {...register('middleName')} className="h-9" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="gender" className="text-xs">Пол</Label>
              <Select value={genderValue || 'NONE'} onValueChange={(value) => setValue('gender', value === 'NONE' ? '' : value)}>
                <SelectTrigger id="gender" className="h-9">
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
              <Label htmlFor="dateOfBirth" className="text-xs">Дата рождения</Label>
              <DatePicker
                value={watch('dateOfBirth')}
                onChange={(date) => setValue('dateOfBirth', date || '')}
                maxDate={new Date()}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address" className="text-xs">Адрес</Label>
            <Input id="address" {...register('address')} className="h-9" />
          </div>

          {!isLegalEntity && (
            <div>
              <Label htmlFor="snils" className="text-xs">СНИЛС</Label>
              <Input id="snils" {...register('snils')} placeholder="000-000-000 00" className="h-9" />
            </div>
          )}

          {/* Контактная информация */}
          <div className="pt-3 border-t">
            <h4 className="text-xs font-medium mb-3 flex items-center gap-2">
              <Phone className="h-3 w-3" />
              Контакты
            </h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="phone" className="flex items-center gap-1 text-xs">
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
              </div>
              <div>
                <Label htmlFor="phoneAdditional" className="text-xs">Дополнительный телефон</Label>
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
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input id="email" type="email" {...register('email')} className="h-9" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="status" className="flex items-center gap-1 text-xs">
                Статус
                <span className="text-yellow-600">*</span>
              </Label>
              <Select value={statusValue} onValueChange={(value) => setValue('status', value as 'ACTIVE' | 'VIP' | 'INACTIVE')}>
                <SelectTrigger id="status" className="bg-yellow-50 h-9">
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
              <Label htmlFor="leadSourceId" className="text-xs">Источник</Label>
              <Select value={leadSourceIdValue || 'NONE'} onValueChange={(value) => setValue('leadSourceId', value === 'NONE' ? '' : value)}>
                <SelectTrigger id="leadSourceId" className="h-9">
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
            <Label htmlFor="benefitCategoryId" className="text-xs">Льготная категория</Label>
            <Select value={benefitCategoryIdValue || 'NONE'} onValueChange={(value) => setValue('benefitCategoryId', value === 'NONE' ? '' : value)}>
              <SelectTrigger id="benefitCategoryId" className="h-9">
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
            <Label htmlFor="notes" className="text-xs">Заметки</Label>
            <Textarea id="notes" {...register('notes')} rows={3} />
          </div>
        </form>
      </div>
    );
  }

  // Режим просмотра
  return (
    <>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <User className="h-4 w-4" />
          Основная информация
        </h3>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Тип клиента</Label>
              <p className="font-medium">{clientTypeLabels[client.clientType]}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Статус</Label>
              <p className="font-medium">
                {client.status === 'ACTIVE' ? 'Активный' : client.status === 'VIP' ? 'VIP' : 'Неактивный'}
              </p>
            </div>
          </div>

          {client.clientType === 'LEGAL_ENTITY' && client.companyName && (
            <div>
              <Label className="text-xs text-muted-foreground">Организация</Label>
              <p className="font-medium">{client.companyName} {client.inn ? `(ИНН: ${client.inn})` : ''}</p>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">
              {client.clientType === 'LEGAL_ENTITY' ? 'Контактное лицо' : 'ФИО'}
            </Label>
            <p className="font-medium">
              {[client.lastName, client.firstName, client.middleName].filter(Boolean).join(' ')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {client.gender && (
              <div>
                <Label className="text-xs text-muted-foreground">Пол</Label>
                <p className="font-medium">{genderLabels[client.gender]}</p>
              </div>
            )}
            {client.dateOfBirth && (
              <div>
                <Label className="text-xs text-muted-foreground">Дата рождения</Label>
                <p className="font-medium">{formatDateOfBirth(client.dateOfBirth)}</p>
              </div>
            )}
          </div>

          {client.address && (
            <div>
              <Label className="text-xs text-muted-foreground">Адрес</Label>
              <p className="font-medium">{client.address}</p>
            </div>
          )}

          {client.clientType === 'INDIVIDUAL' && client.snils && (
            <div>
              <Label className="text-xs text-muted-foreground">СНИЛС</Label>
              <p className="font-medium">{client.snils}</p>
            </div>
          )}

          {client.leadSource && (
            <div>
              <Label className="text-xs text-muted-foreground">Источник привлечения</Label>
              <p className="font-medium">{client.leadSource.name}</p>
            </div>
          )}

          {client.benefitCategory && (
            <div>
              <Label className="text-xs text-muted-foreground">Льготная категория</Label>
              <p className="font-medium">
                {client.benefitCategory.name} ({client.benefitCategory.discountPercent}%)
              </p>
            </div>
          )}

          {client.notes && (
            <div>
              <Label className="text-xs text-muted-foreground">Заметки</Label>
              <p className="font-medium whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}

          <div className="pt-3 border-t grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>Создан: {formatDate(client.createdAt)}</div>
            <div>Обновлен: {formatDate(client.updatedAt)}</div>
          </div>
        </div>
      </div>

      {/* Контактная информация */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Контакты
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-muted-foreground">Телефон</Label>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{client.phone || '—'}</p>
                {client.phone && <CallButton phoneNumber={client.phone} clientId={client.id} />}
              </div>
            </div>
          </div>

          {client.phoneAdditional && (
            <div>
              <Label className="text-xs text-muted-foreground">Дополнительный телефон</Label>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{client.phoneAdditional}</p>
                <CallButton phoneNumber={client.phoneAdditional} clientId={client.id} />
              </div>
            </div>
          )}

          {client.email && (
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm font-medium">{client.email}</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${client.email}`}>Написать</a>
              </Button>
            </div>
          )}
        </div>

        {/* Telegram интеграция */}
        {client.telegramAccounts && client.telegramAccounts.length > 0 && (
          <div className="pt-3 mt-3 border-t">
            <h4 className="text-xs font-medium mb-3 flex items-center gap-2">
              <svg className="h-3 w-3" viewBox="0 0 240 240" fill="currentColor">
                <path d="M120,0 C53.8,0 0,53.8 0,120 S53.8,240 120,240 S240,186.2 240,120 S186.2,0 120,0z M171.1,79 L155.5,156 C154.3,162.4 150.6,163.9 145.4,160.9 L116.4,140.1 L102.3,153.6 C100.9,155 99.7,156.2 96.9,156.2 L98.7,126.7 L152.5,79.2 C154.7,77.3 152,76.2 149,78.1 L81.6,118.7 L53,110 C46.8,108 46.6,103.8 54.3,100.8 L164.9,61.5 C170.1,59.5 174.7,62.5 171.1,79z"/>
              </svg>
              Telegram ({client.telegramAccounts.length})
            </h4>
            <div className="space-y-2">
              {client.telegramAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                      <svg className="h-4 w-4 text-blue-600" viewBox="0 0 240 240" fill="currentColor">
                        <path d="M120,0 C53.8,0 0,53.8 0,120 S53.8,240 120,240 S240,186.2 240,120 S186.2,0 120,0z M171.1,79 L155.5,156 C154.3,162.4 150.6,163.9 145.4,160.9 L116.4,140.1 L102.3,153.6 C100.9,155 99.7,156.2 96.9,156.2 L98.7,126.7 L152.5,79.2 C154.7,77.3 152,76.2 149,78.1 L81.6,118.7 L53,110 C46.8,108 46.6,103.8 54.3,100.8 L164.9,61.5 C170.1,59.5 174.7,62.5 171.1,79z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {account.username ? `@${account.username}` : `${account.firstName} ${account.lastName || ''}`}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant={account.isNotificationsEnabled ? "default" : "secondary"} className={`text-[10px] ${account.isNotificationsEnabled ? 'bg-green-600 hover:bg-green-700' : ''}`}>
                          {account.isNotificationsEnabled ? 'Уведомления вкл' : 'Уведомления выкл'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={account.isNotificationsEnabled}
                      onCheckedChange={(checked) => handleToggleNotifications(account, checked)}
                      className="data-[state=checked]:bg-green-600"
                    />
                    {account.conversations && account.conversations.some(c => c.status === 'OPEN') && (
                      <Button variant="ghost" size="sm" onClick={() => handleWriteToTelegram(account)}>
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleUnlinkAccount(account)} className="text-destructive hover:text-destructive">
                      <Unlink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Диалог подтверждения отвязки */}
      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отвязать Telegram аккаунт?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите отвязать аккаунт {accountToUnlink?.username ? `@${accountToUnlink.username}` : accountToUnlink?.firstName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnlink} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Отвязать
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
