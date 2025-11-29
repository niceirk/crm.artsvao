'use client';

import { useState } from 'react';
import { ComponentDemo } from '../component-demo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { UsageItem } from '../usage-info';

interface DemoProps {
  usages?: UsageItem[];
}

export function AlertDemo({ usages }: DemoProps) {
  const [variant, setVariant] = useState<'default' | 'destructive'>('default');

  const code = `<Alert variant="${variant}">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Внимание!</AlertTitle>
  <AlertDescription>
    Это важное уведомление для пользователя.
  </AlertDescription>
</Alert>`;

  return (
    <ComponentDemo
      title="Alert"
      description="Уведомления и предупреждения"
      usages={usages}
      preview={
        <Alert variant={variant} className="w-full max-w-md">
          {variant === 'destructive' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          <AlertTitle>Внимание!</AlertTitle>
          <AlertDescription>
            Это важное уведомление для пользователя.
          </AlertDescription>
        </Alert>
      }
      code={code}
      controls={
        <div className="space-y-2">
          <Label>Вариант</Label>
          <Select value={variant} onValueChange={(v: any) => setVariant(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="destructive">Destructive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    />
  );
}

export function ToastDemo({ usages }: DemoProps) {
  const code = `import { toast } from 'sonner';

// Обычное уведомление (info)
toast.info('Операция выполнена успешно');

// Успешное уведомление
toast.success('Данные сохранены!');

// Ошибка
toast.error('Произошла ошибка!');

// С описанием
toast('Событие создано', {
  description: 'Расписание обновлено',
});`;

  return (
    <ComponentDemo
      title="Toast"
      description="Всплывающие уведомления (Sonner)"
      usages={usages}
      preview={
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => toast.info('Операция выполнена успешно')}>
            Обычный Toast
          </Button>
          <Button onClick={() => toast.success('Данные сохранены!')} variant="outline">
            Успешный
          </Button>
          <Button onClick={() => toast.error('Произошла ошибка!')} variant="destructive">
            Ошибка
          </Button>
          <Button
            onClick={() =>
              toast('Событие создано', {
                description: 'Расписание обновлено',
              })
            }
            variant="secondary"
          >
            С описанием
          </Button>
        </div>
      }
      code={code}
    />
  );
}

export function SkeletonDemo({ usages }: DemoProps) {
  const code = `<div className="flex items-center space-x-4">
  <Skeleton className="h-12 w-12 rounded-full" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
  </div>
</div>`;

  return (
    <ComponentDemo
      title="Skeleton"
      description="Скелетон для состояния загрузки"
      usages={usages}
      preview={
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      }
      code={code}
    />
  );
}
