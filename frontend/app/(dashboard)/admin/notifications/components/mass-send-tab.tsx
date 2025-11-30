'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Send, Loader2, AlertTriangle, Info } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  useTemplates,
  useCreateMassSend,
  usePreviewTemplate,
} from '@/hooks/use-notifications';
import { useStudios } from '@/hooks/use-studios';
import { useGroups } from '@/hooks/use-groups';
import { NotificationChannel, MassSendDto } from '@/lib/types/notifications';

interface FormValues {
  channel: NotificationChannel;
  templateCode: string;
  studioId: string;
  groupId: string;
  testMode: boolean;
  customPayload: string;
}

export function MassSendTab() {
  const { data: templates } = useTemplates({ isActive: true });
  const { data: studios } = useStudios();
  const { data: groupsData } = useGroups({ limit: 1000 });
  const groups = groupsData?.data || [];
  const createMassSend = useCreateMassSend();
  const previewTemplate = usePreviewTemplate();

  const [previewBody, setPreviewBody] = useState<string>('');

  const form = useForm<FormValues>({
    defaultValues: {
      channel: NotificationChannel.TELEGRAM,
      templateCode: '',
      studioId: '',
      groupId: '',
      testMode: true,
      customPayload: '{}',
    },
  });

  const channel = form.watch('channel');
  const templateCode = form.watch('templateCode');
  const studioId = form.watch('studioId');

  // Фильтруем шаблоны по выбранному каналу
  const filteredTemplates = templates?.filter((t) => t.channel === channel) || [];

  // Фильтруем группы по выбранной студии
  const filteredGroups = studioId
    ? groups.filter((g: any) => g.studioId === studioId)
    : groups;

  const selectedTemplate = filteredTemplates.find(
    (t) => t.code === templateCode
  );

  const handlePreview = async () => {
    if (!selectedTemplate) return;

    try {
      const customPayload = JSON.parse(form.getValues('customPayload') || '{}');
      const result = await previewTemplate.mutateAsync({
        id: selectedTemplate.id,
        data: {
          ...customPayload,
          clientName: 'Иван Иванов',
          clientFirstName: 'Иван',
          clientLastName: 'Иванов',
        },
      });
      setPreviewBody(result.body);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        setPreviewBody('Ошибка: Невалидный JSON');
      } else {
        setPreviewBody(`Ошибка: ${error.message}`);
      }
    }
  };

  const onSubmit = (values: FormValues) => {
    let payload: Record<string, any> = {};
    try {
      payload = JSON.parse(values.customPayload || '{}');
    } catch {
      // Игнорируем ошибку парсинга
    }

    const data: MassSendDto = {
      channel: values.channel,
      templateCode: values.templateCode,
      payload,
      filters: {
        studioId: values.studioId || undefined,
        groupId: values.groupId || undefined,
      },
      testMode: values.testMode,
    };

    createMassSend.mutate(data, {
      onSuccess: () => {
        form.reset();
        setPreviewBody('');
      },
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Новая рассылка</CardTitle>
          <CardDescription>
            Отправка уведомлений группе клиентов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Канал доставки</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('templateCode', '');
                      }}
                      value={field.value}
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

              <FormField
                control={form.control}
                name="templateCode"
                rules={{ required: 'Выберите шаблон' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Шаблон</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите шаблон" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.code}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Только активные шаблоны для выбранного канала
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="studioId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Студия (опционально)</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value === 'all' ? '' : value);
                        form.setValue('groupId', '');
                      }}
                      value={field.value || 'all'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Все студии" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Все студии</SelectItem>
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
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Группа (опционально)</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === 'all' ? '' : value)
                      }
                      value={field.value || 'all'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Все группы" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Все группы</SelectItem>
                        {filteredGroups.map((group: any) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
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
                name="customPayload"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дополнительные данные (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder='{"promoCode": "SALE2024"}'
                        rows={3}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      Переменные для подстановки в шаблон
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="testMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Тестовый режим</FormLabel>
                      <FormDescription>
                        Отправить только первым 10 получателям
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreview}
                  disabled={!selectedTemplate || previewTemplate.isPending}
                >
                  {previewTemplate.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Предпросмотр
                </Button>
                <Button
                  type="submit"
                  disabled={createMassSend.isPending || !templateCode}
                >
                  {createMassSend.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Отправить рассылку
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Как работает рассылка</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 text-sm list-disc list-inside space-y-1">
              <li>Уведомления добавляются в очередь</li>
              <li>Отправляются с учётом rate limits каналов</li>
              <li>
                Учитываются настройки клиентов (отключённые уведомления пропускаются)
              </li>
              <li>В тестовом режиме отправляется только 10 сообщений</li>
            </ul>
          </AlertDescription>
        </Alert>

        {!form.watch('testMode') && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Внимание!</AlertTitle>
            <AlertDescription>
              Тестовый режим отключён. Рассылка будет отправлена всем выбранным
              клиентам.
            </AlertDescription>
          </Alert>
        )}

        {previewBody && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Предпросмотр</CardTitle>
            </CardHeader>
            <CardContent>
              {channel === NotificationChannel.EMAIL ? (
                <div
                  dangerouslySetInnerHTML={{ __html: previewBody }}
                  className="prose prose-sm max-w-none"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded">
                  {previewBody}
                </pre>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
