'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DocumentType, CreateClientDocumentDto } from '@/lib/types/clients';

// Маппинг типов документов на русские названия
const documentTypeLabels: Record<DocumentType, string> = {
  PASSPORT: 'Паспорт РФ',
  BIRTH_CERTIFICATE: 'Свидетельство о рождении',
  DRIVERS_LICENSE: 'Водительское удостоверение',
  SNILS: 'СНИЛС',
  FOREIGN_PASSPORT: 'Заграничный паспорт',
  INN: 'ИНН',
  MEDICAL_CERTIFICATE: 'Медицинская справка',
  MSE_CERTIFICATE: 'Справка МСЭ',
  OTHER: 'Другой документ',
};

// Конфигурация полей для каждого типа документа
const documentFieldsConfig: Record<DocumentType, string[]> = {
  PASSPORT: ['series', 'number', 'issuedBy', 'issuedAt', 'departmentCode', 'citizenship'],
  BIRTH_CERTIFICATE: ['series', 'number', 'issuedBy', 'issuedAt'],
  DRIVERS_LICENSE: ['series', 'number', 'issuedBy', 'issuedAt', 'expiresAt'],
  SNILS: ['number'],
  FOREIGN_PASSPORT: ['series', 'number', 'issuedBy', 'issuedAt', 'expiresAt', 'citizenship'],
  INN: ['number'],
  MEDICAL_CERTIFICATE: ['number', 'issuedBy', 'issuedAt', 'expiresAt'],
  MSE_CERTIFICATE: ['series', 'number', 'issuedBy', 'issuedAt', 'expiresAt'],
  OTHER: ['series', 'number', 'issuedBy', 'issuedAt', 'expiresAt', 'fullDisplay'],
};

// Схема валидации
const formSchema = z.object({
  documentType: z.enum([
    'PASSPORT',
    'BIRTH_CERTIFICATE',
    'DRIVERS_LICENSE',
    'SNILS',
    'FOREIGN_PASSPORT',
    'INN',
    'MEDICAL_CERTIFICATE',
    'MSE_CERTIFICATE',
    'OTHER',
  ]),
  series: z.string().optional(),
  number: z.string().optional(),
  issuedBy: z.string().optional(),
  issuedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  departmentCode: z.string().optional(),
  isPrimary: z.boolean().default(false),
  citizenship: z.string().optional(),
  fullDisplay: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface LocalDocumentDialogProps {
  document?: (CreateClientDocumentDto & { localId: string }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (document: CreateClientDocumentDto) => void;
}

export function LocalDocumentDialog({
  document,
  open,
  onOpenChange,
  onSave,
}: LocalDocumentDialogProps) {
  const isEditing = !!document;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentType: document?.documentType || 'PASSPORT',
      series: document?.series || '',
      number: document?.number || '',
      issuedBy: document?.issuedBy || '',
      issuedAt: document?.issuedAt ? new Date(document.issuedAt) : undefined,
      expiresAt: document?.expiresAt ? new Date(document.expiresAt) : undefined,
      departmentCode: document?.departmentCode || '',
      isPrimary: document?.isPrimary || false,
      citizenship: document?.citizenship || '',
      fullDisplay: document?.fullDisplay || '',
    },
  });

  const selectedDocumentType = form.watch('documentType');
  const visibleFields = documentFieldsConfig[selectedDocumentType] || [];

  // Сброс формы при открытии/закрытии
  useEffect(() => {
    if (!open) {
      form.reset();
    } else if (document) {
      form.reset({
        documentType: document.documentType,
        series: document.series || '',
        number: document.number || '',
        issuedBy: document.issuedBy || '',
        issuedAt: document.issuedAt ? new Date(document.issuedAt) : undefined,
        expiresAt: document.expiresAt ? new Date(document.expiresAt) : undefined,
        departmentCode: document.departmentCode || '',
        isPrimary: document.isPrimary || false,
        citizenship: document.citizenship || '',
        fullDisplay: document.fullDisplay || '',
      });
    } else {
      form.reset({
        documentType: 'PASSPORT',
        series: '',
        number: '',
        issuedBy: '',
        issuedAt: undefined,
        expiresAt: undefined,
        departmentCode: '',
        isPrimary: false,
        citizenship: '',
        fullDisplay: '',
      });
    }
  }, [open, document, form]);

  const onSubmit = (data: FormData) => {
    const documentData: CreateClientDocumentDto = {
      documentType: data.documentType,
      series: data.series || undefined,
      number: data.number || undefined,
      issuedBy: data.issuedBy || undefined,
      issuedAt: data.issuedAt ? data.issuedAt.toISOString() : undefined,
      expiresAt: data.expiresAt ? data.expiresAt.toISOString() : undefined,
      departmentCode: data.departmentCode || undefined,
      isPrimary: data.isPrimary,
      citizenship: data.citizenship || undefined,
      fullDisplay: data.fullDisplay || undefined,
    };

    onSave(documentData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редактировать документ' : 'Добавить документ'}
          </DialogTitle>
          <DialogDescription>
            Заполните информацию о документе клиента
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Тип документа */}
            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип документа</FormLabel>
                  <Select
                    disabled={isEditing}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип документа" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(documentTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Динамические поля в зависимости от типа документа */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleFields.includes('series') && (
                <FormField
                  control={form.control}
                  name="series"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Серия</FormLabel>
                      <FormControl>
                        <Input placeholder="Серия документа" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {visibleFields.includes('number') && (
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Номер</FormLabel>
                      <FormControl>
                        <Input placeholder="Номер документа" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {visibleFields.includes('issuedBy') && (
              <FormField
                control={form.control}
                name="issuedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Кем выдан</FormLabel>
                    <FormControl>
                      <Input placeholder="Орган, выдавший документ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleFields.includes('issuedAt') && (
                <FormField
                  control={form.control}
                  name="issuedAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Дата выдачи</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: ru })
                              ) : (
                                <span>Выберите дату</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            locale={ru}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {visibleFields.includes('expiresAt') && (
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Срок действия</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: ru })
                              ) : (
                                <span>Выберите дату</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            locale={ru}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {visibleFields.includes('departmentCode') && (
              <FormField
                control={form.control}
                name="departmentCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Код подразделения</FormLabel>
                    <FormControl>
                      <Input placeholder="000-000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {visibleFields.includes('citizenship') && (
              <FormField
                control={form.control}
                name="citizenship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Гражданство</FormLabel>
                    <FormControl>
                      <Input placeholder="Россия" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {visibleFields.includes('fullDisplay') && (
              <FormField
                control={form.control}
                name="fullDisplay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Полное описание</FormLabel>
                    <FormControl>
                      <Input placeholder="Полная информация о документе" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Основной документ */}
            <FormField
              control={form.control}
              name="isPrimary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Основной документ
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit">
                {isEditing ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
