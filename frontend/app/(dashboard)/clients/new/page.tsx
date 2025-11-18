'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Save, User, Phone, FileText, Award } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { useCreateClient, useCheckDuplicate } from '@/hooks/useClients';
import { useActiveLeadSources } from '@/hooks/useLeadSources';
import { useBenefitCategories } from '@/hooks/useBenefitCategories';
import { LocalDocumentsManager } from './components/local-documents-manager';
import { createClientDocument } from '@/lib/api/clients';
import type { CreateClientDocumentDto } from '@/lib/types/clients';
import { toast } from 'sonner';
import { cleanPhoneNumber } from '@/lib/utils/phone';

const clientSchema = z.object({
  clientType: z.enum(['INDIVIDUAL', 'LEGAL_ENTITY']),
  firstName: z.string().min(1, 'Обязательное поле'),
  lastName: z.string().min(1, 'Обязательное поле'),
  middleName: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  companyName: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  inn: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  snils: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  gender: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  dateOfBirth: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  phone: z.string().optional().or(z.literal('')),
  phoneAdditional: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')).transform(val => val || undefined),
  address: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  status: z.enum(['ACTIVE', 'INACTIVE', 'VIP']),
  leadSourceId: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  benefitCategoryId: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  notes: z.string().optional().or(z.literal('')).transform(val => val || undefined),
}).superRefine((data, ctx) => {
  // Для физических лиц пол обязателен
  if (data.clientType === 'INDIVIDUAL' && !data.gender) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Обязательное поле',
      path: ['gender'],
    });
  }

  // Телефон обязателен - проверяем исходное значение до transform
  // Если phone undefined или пустая строка, или содержит менее 11 цифр
  const phoneDigits = data.phone ? data.phone.toString().replace(/\D/g, '') : '';
  console.log('Валидация телефона - phone:', data.phone);
  console.log('Валидация телефона - phoneDigits:', phoneDigits);
  console.log('Валидация телефона - length:', phoneDigits.length);
  if (!phoneDigits || phoneDigits.length < 11) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Обязательное поле',
      path: ['phone'],
    });
  }
});

type ClientFormData = z.infer<typeof clientSchema>;

export default function NewClientPage() {
  const router = useRouter();
  const createClient = useCreateClient();
  const { data: leadSources, isLoading: isLoadingLeadSources } = useActiveLeadSources();
  const { data: benefitCategories, isLoading: isLoadingBenefitCategories } = useBenefitCategories();
  const [localDocuments, setLocalDocuments] = useState<Array<CreateClientDocumentDto & { localId: string }>>([]);
  const [isCreatingDocuments, setIsCreatingDocuments] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      clientType: 'INDIVIDUAL',
      status: 'ACTIVE',
      phone: '',
      phoneAdditional: '',
    },
  });

  const clientTypeValue = watch('clientType');
  const genderValue = watch('gender');
  const statusValue = watch('status');
  const leadSourceIdValue = watch('leadSourceId');
  const benefitCategoryIdValue = watch('benefitCategoryId');
  const phoneValue = watch('phone');

  // Проверка дубликатов по телефону
  const { data: duplicate } = useCheckDuplicate(phoneValue || '');

  const isLegalEntity = clientTypeValue === 'LEGAL_ENTITY';

  const onSubmit = async (data: ClientFormData) => {
    // Очистить пустые значения и обработать телефоны
    const cleanedData = {
      ...data,
      phone: cleanPhoneNumber(data.phone),
      phoneAdditional: cleanPhoneNumber(data.phoneAdditional),
      middleName: data.middleName || null,
      companyName: data.companyName || null,
      inn: data.inn || null,
      snils: data.snils || null,
      // Gender обязателен для физлиц, но необязателен для юрлиц
      gender: data.clientType === 'INDIVIDUAL' ? data.gender : null,
      dateOfBirth: data.dateOfBirth || null,
      email: data.email || null,
      address: data.address || null,
      leadSourceId: data.leadSourceId || null,
      benefitCategoryId: data.benefitCategoryId || null,
      notes: data.notes || null,
    };

    createClient.mutate(cleanedData, {
      onSuccess: async (newClient) => {
        // Если есть документы, создаем их
        if (localDocuments.length > 0) {
          setIsCreatingDocuments(true);
          try {
            // Создаем все документы последовательно
            for (const doc of localDocuments) {
              const { localId, ...documentData } = doc;
              await createClientDocument(newClient.id, documentData);
            }
            toast.success(`Клиент и ${localDocuments.length} документов успешно созданы`);
          } catch (error: any) {
            toast.error('Клиент создан, но не все документы удалось сохранить');
          } finally {
            setIsCreatingDocuments(false);
          }
        }
        router.push(`/clients/${newClient.id}`);
      },
    });
  };

  return (
    <div className="flex-1 space-y-4">
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Новый клиент</h2>
          <p className="text-muted-foreground">
            Заполните данные для создания нового клиента. Поля, отмеченные <span className="text-yellow-600">*</span>, обязательны для заполнения.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Данные клиента</CardTitle>
            <CardDescription>
              Заполните информацию о клиенте. Поля, отмеченные <span className="text-yellow-600">*</span>, обязательны для заполнения.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Левая колонка - Основная информация */}
              <div className="space-y-6">
                {/* Основная информация */}
                <div>
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Основная информация
                  </h3>
                  <div className="space-y-4">
                    {/* Тип клиента и статус */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="clientType" className="flex items-center gap-1">
                          Тип клиента
                          <span className="text-yellow-600">*</span>
                        </Label>
                        <Select
                          value={clientTypeValue || 'INDIVIDUAL'}
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
                      <div>
                        <Label htmlFor="status" className="flex items-center gap-1">
                          Статус
                          <span className="text-yellow-600">*</span>
                        </Label>
                        <Select
                          value={statusValue || 'ACTIVE'}
                          onValueChange={(value) => setValue('status', value as any)}
                        >
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
                    </div>

                    {/* ФИО */}
                    <div className="space-y-4">
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
                          <p className="text-sm text-destructive mt-1">
                            {errors.lastName.message}
                          </p>
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
                          <p className="text-sm text-destructive mt-1">
                            {errors.firstName.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="middleName">
                          {isLegalEntity ? 'Контакт (Отчество)' : 'Отчество'}
                        </Label>
                        <Input id="middleName" {...register('middleName')} />
                      </div>
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

                    {/* Поля для физического лица */}
                    {!isLegalEntity && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="gender" className="flex items-center gap-1">
                              Пол
                              <span className="text-yellow-600">*</span>
                            </Label>
                            <Select
                              value={genderValue || ''}
                              onValueChange={(value) => setValue('gender', value)}
                            >
                              <SelectTrigger id="gender" className={errors.gender ? 'border-destructive bg-yellow-50' : 'bg-yellow-50'}>
                                <SelectValue placeholder="Выберите пол" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MALE">Мужской</SelectItem>
                                <SelectItem value="FEMALE">Женский</SelectItem>
                              </SelectContent>
                            </Select>
                            {errors.gender && (
                              <p className="text-sm text-destructive mt-1">
                                {errors.gender.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="dateOfBirth">Дата рождения</Label>
                            <DatePicker
                              value={watch('dateOfBirth')}
                              onChange={(date) => setValue('dateOfBirth', date || '')}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="snils">СНИЛС</Label>
                          <Input
                            id="snils"
                            {...register('snils')}
                            placeholder="123-456-789 00"
                            maxLength={14}
                          />
                        </div>
                      </>
                    )}

                  </div>
                </div>

                {/* Дополнительная информация */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Дополнительная информация
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="benefitCategoryId">Льготная категория</Label>
                      <Select
                        value={benefitCategoryIdValue || 'NONE'}
                        onValueChange={(value) => setValue('benefitCategoryId', value === 'NONE' ? '' : value)}
                        disabled={isLoadingBenefitCategories}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Не указана" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Не указана</SelectItem>
                          {benefitCategories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name} ({category.discountPercent}% скидка)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="leadSourceId">Источник привлечения</Label>
                      <Select
                        value={leadSourceIdValue || 'NONE'}
                        onValueChange={(value) => setValue('leadSourceId', value === 'NONE' ? '' : value)}
                        disabled={isLoadingLeadSources}
                      >
                        <SelectTrigger>
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
                    <div>
                      <Label htmlFor="notes">Примечания</Label>
                      <Textarea id="notes" {...register('notes')} rows={4} placeholder="Дополнительная информация о клиенте..." />
                    </div>
                  </div>
                </div>
              </div>

              {/* Разделитель между колонками */}
              <div className="hidden lg:block border-l"></div>

              {/* Правая колонка - Контакты и Документы */}
              <div className="space-y-6 lg:border-t-0 border-t lg:pt-0 pt-6">
                {/* Контактная информация */}
                <div>
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
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
                        <p className="text-sm text-destructive mt-1">
                          {errors.phone.message}
                        </p>
                      )}
                      {duplicate && (
                        <Alert variant="default" className="mt-2 border-amber-500 bg-amber-50">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-amber-800">Возможный дубликат</AlertTitle>
                          <AlertDescription className="text-amber-700">
                            Клиент с таким телефоном уже существует:{' '}
                            <Link
                              href={`/clients/${duplicate.id}`}
                              className="font-medium underline hover:no-underline"
                            >
                              {duplicate.lastName} {duplicate.firstName}
                            </Link>
                          </AlertDescription>
                        </Alert>
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
                        <p className="text-sm text-destructive mt-1">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="address">Адрес</Label>
                      <Input id="address" {...register('address')} />
                    </div>
                  </div>
                </div>

                {/* Документы */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Документы
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isLegalEntity
                      ? 'Учредительные документы организации'
                      : 'Паспорт, СНИЛС и другие документы клиента'
                    }
                  </p>
                  <LocalDocumentsManager
                    documents={localDocuments}
                    onDocumentsChange={setLocalDocuments}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Кнопки действий */}
        <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-background py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={createClient.isPending || isCreatingDocuments}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={createClient.isPending || isCreatingDocuments}>
            <Save className="mr-2 h-4 w-4" />
            {createClient.isPending
              ? 'Создание клиента...'
              : isCreatingDocuments
              ? 'Сохранение документов...'
              : 'Создать клиента'}
          </Button>
        </div>
      </form>
    </div>
  );
}
