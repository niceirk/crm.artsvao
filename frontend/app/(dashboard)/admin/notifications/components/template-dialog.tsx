'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Eye } from 'lucide-react';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCreateTemplate,
  useUpdateTemplate,
  usePreviewTemplate,
} from '@/hooks/use-notifications';
import {
  NotificationTemplate,
  NotificationChannel,
  CreateTemplateDto,
} from '@/lib/types/notifications';

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: NotificationTemplate;
}

interface FormValues {
  code: string;
  channel: NotificationChannel;
  name: string;
  description: string;
  subject: string;
  body: string;
  isActive: boolean;
}

export function TemplateDialog({
  open,
  onOpenChange,
  template,
}: TemplateDialogProps) {
  const isEditing = !!template;
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const previewTemplate = usePreviewTemplate();

  const [previewData, setPreviewData] = useState<string>('{}');
  const [previewResult, setPreviewResult] = useState<string>('');
  const [activeTab, setActiveTab] = useState('edit');

  const form = useForm<FormValues>({
    defaultValues: {
      code: '',
      channel: NotificationChannel.TELEGRAM,
      name: '',
      description: '',
      subject: '',
      body: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        code: template.code,
        channel: template.channel,
        name: template.name,
        description: template.description || '',
        subject: template.subject || '',
        body: template.body,
        isActive: template.isActive,
      });
    } else {
      form.reset({
        code: '',
        channel: NotificationChannel.TELEGRAM,
        name: '',
        description: '',
        subject: '',
        body: '',
        isActive: true,
      });
    }
  }, [template, form]);

  const onSubmit = (values: FormValues) => {
    if (isEditing) {
      updateTemplate.mutate(
        {
          id: template.id,
          data: {
            name: values.name,
            description: values.description || undefined,
            subject: values.subject || undefined,
            body: values.body,
            isActive: values.isActive,
          },
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      const data: CreateTemplateDto = {
        code: values.code,
        channel: values.channel,
        name: values.name,
        description: values.description || undefined,
        subject: values.subject || undefined,
        body: values.body,
        isActive: values.isActive,
      };
      createTemplate.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const handlePreview = async () => {
    if (!template) return;

    try {
      const sampleData = JSON.parse(previewData);
      const result = await previewTemplate.mutateAsync({
        id: template.id,
        data: sampleData,
      });
      setPreviewResult(result.body);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        setPreviewResult('Ошибка: Невалидный JSON в тестовых данных');
      } else {
        setPreviewResult(`Ошибка: ${error.message}`);
      }
    }
  };

  const isPending = createTemplate.isPending || updateTemplate.isPending;
  const channel = form.watch('channel');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редактировать шаблон' : 'Создать шаблон'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Измените параметры шаблона уведомления'
              : 'Создайте новый шаблон для уведомлений'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="edit">Редактирование</TabsTrigger>
            {isEditing && <TabsTrigger value="preview">Предпросмотр</TabsTrigger>}
          </TabsList>

          <TabsContent value="edit">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    rules={{ required: 'Обязательное поле' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Код шаблона</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="welcome_message"
                            disabled={isEditing}
                          />
                        </FormControl>
                        <FormDescription>
                          Уникальный идентификатор для API
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Канал</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isEditing}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={NotificationChannel.TELEGRAM}>
                              Telegram
                            </SelectItem>
                            <SelectItem value={NotificationChannel.EMAIL}>
                              Email
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: 'Обязательное поле' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Приветственное сообщение" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Описание</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Отправляется новым клиентам при регистрации"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {channel === NotificationChannel.EMAIL && (
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тема письма</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Добро пожаловать в АртСВАО!"
                          />
                        </FormControl>
                        <FormDescription>
                          Поддерживаются переменные: {'{{clientName}}'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="body"
                  rules={{ required: 'Обязательное поле' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Текст сообщения</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={
                            channel === NotificationChannel.EMAIL
                              ? '<h1>Привет, {{clientName}}!</h1>\n<p>Добро пожаловать...</p>'
                              : 'Здравствуйте, {{clientName}}!\n\nДобро пожаловать в АртСВАО!'
                          }
                          rows={10}
                          className="font-mono text-sm"
                        />
                      </FormControl>
                      <FormDescription>
                        Handlebars синтаксис. Переменные: {'{{clientName}}'},{' '}
                        {'{{clientFirstName}}'}, {'{{formatDate date}}'},{' '}
                        {'{{formatMoney amount}}'}, {'{{pluralizeVisits count}}'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Активен</FormLabel>
                        <FormDescription>
                          Неактивные шаблоны не будут использоваться для отправки
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

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Отмена
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Сохранить' : 'Создать'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          {isEditing && (
            <TabsContent value="preview" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Тестовые данные (JSON)</label>
                <Textarea
                  value={previewData}
                  onChange={(e) => setPreviewData(e.target.value)}
                  placeholder='{"clientName": "Иван Иванов", "amount": 5000}'
                  rows={5}
                  className="font-mono text-sm mt-2"
                />
              </div>

              <Button onClick={handlePreview} disabled={previewTemplate.isPending}>
                {previewTemplate.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                Показать предпросмотр
              </Button>

              {previewResult && (
                <div>
                  <label className="text-sm font-medium">Результат</label>
                  <div className="mt-2 p-4 border rounded-lg bg-muted">
                    {channel === NotificationChannel.EMAIL ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: previewResult }}
                        className="prose prose-sm max-w-none"
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm">
                        {previewResult}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
