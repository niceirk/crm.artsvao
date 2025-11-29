'use client';

import { useState } from 'react';
import { ComponentDemo } from '../component-demo';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UsageItem } from '../usage-info';

interface DemoProps {
  usages?: UsageItem[];
}

export function CardDemo({ usages }: DemoProps) {
  const code = `<Card>
  <CardHeader>
    <CardTitle>Заголовок карточки</CardTitle>
    <CardDescription>Описание карточки</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Содержимое карточки</p>
  </CardContent>
  <CardFooter>
    <p>Подвал карточки</p>
  </CardFooter>
</Card>`;

  return (
    <ComponentDemo
      title="Card"
      description="Карточка для группировки контента"
      usages={usages}
      preview={
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Заголовок карточки</CardTitle>
            <CardDescription>Описание карточки</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Содержимое карточки</p>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">Подвал карточки</p>
          </CardFooter>
        </Card>
      }
      code={code}
    />
  );
}

export function BadgeDemo({ usages }: DemoProps) {
  const [variant, setVariant] = useState<'default' | 'secondary' | 'destructive' | 'outline'>('default');

  const code = `<Badge variant="${variant}">Значок</Badge>`;

  return (
    <ComponentDemo
      title="Badge"
      description="Значки для статусов и меток"
      usages={usages}
      preview={
        <Badge variant={variant}>Значок</Badge>
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
              <SelectItem value="secondary">Secondary</SelectItem>
              <SelectItem value="destructive">Destructive</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    />
  );
}

export function AvatarDemo({ usages }: DemoProps) {
  const code = `<Avatar>
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>`;

  return (
    <ComponentDemo
      title="Avatar"
      description="Аватар пользователя"
      usages={usages}
      preview={
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      }
      code={code}
    />
  );
}

export function TableDemo({ usages }: DemoProps) {
  const code = `<Table>
  <TableCaption>Список клиентов</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Имя</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Статус</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Иван Иванов</TableCell>
      <TableCell>ivan@example.com</TableCell>
      <TableCell>Активен</TableCell>
    </TableRow>
    <TableRow>
      <TableCell>Мария Петрова</TableCell>
      <TableCell>maria@example.com</TableCell>
      <TableCell>Активна</TableCell>
    </TableRow>
  </TableBody>
</Table>`;

  return (
    <ComponentDemo
      title="Table"
      description="Таблица для отображения данных"
      usages={usages}
      preview={
        <div className="w-full">
          <Table>
            <TableCaption>Список клиентов</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Иван Иванов</TableCell>
                <TableCell>ivan@example.com</TableCell>
                <TableCell>
                  <Badge>Активен</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Мария Петрова</TableCell>
                <TableCell>maria@example.com</TableCell>
                <TableCell>
                  <Badge>Активна</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      }
      code={code}
    />
  );
}

export function SeparatorDemo({ usages }: DemoProps) {
  const code = `<div>
  <div className="space-y-1">
    <h4 className="text-sm font-medium">Заголовок раздела</h4>
    <p className="text-sm text-muted-foreground">
      Описание раздела
    </p>
  </div>
  <Separator className="my-4" />
  <div className="flex h-5 items-center space-x-4 text-sm">
    <div>Блог</div>
    <Separator orientation="vertical" />
    <div>Документация</div>
    <Separator orientation="vertical" />
    <div>Поддержка</div>
  </div>
</div>`;

  return (
    <ComponentDemo
      title="Separator"
      description="Разделитель для визуального разграничения контента"
      usages={usages}
      preview={
        <div>
          <div className="space-y-1">
            <h4 className="text-sm font-medium leading-none">Заголовок раздела</h4>
            <p className="text-sm text-muted-foreground">
              Описание раздела
            </p>
          </div>
          <Separator className="my-4" />
          <div className="flex h-5 items-center space-x-4 text-sm">
            <div>Блог</div>
            <Separator orientation="vertical" />
            <div>Документация</div>
            <Separator orientation="vertical" />
            <div>Поддержка</div>
          </div>
        </div>
      }
      code={code}
    />
  );
}

export function ProgressDemo({ usages }: DemoProps) {
  const [progress, setProgress] = useState(33);

  const code = `<Progress value={${progress}} className="w-[60%]" />`;

  return (
    <ComponentDemo
      title="Progress"
      description="Индикатор прогресса выполнения"
      usages={usages}
      preview={
        <Progress value={progress} className="w-[60%]" />
      }
      code={code}
      controls={
        <div className="space-y-2">
          <Label>Прогресс: {progress}%</Label>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full"
          />
        </div>
      }
    />
  );
}

export function ScrollAreaDemo({ usages }: DemoProps) {
  const tags = Array.from({ length: 50 }).map(
    (_, i) => `Элемент ${i + 1}`
  );

  const code = `<ScrollArea className="h-72 w-48 rounded-md border">
  <div className="p-4">
    <h4 className="mb-4 text-sm font-medium">Теги</h4>
    {tags.map((tag) => (
      <div key={tag} className="text-sm">
        {tag}
      </div>
    ))}
  </div>
</ScrollArea>`;

  return (
    <ComponentDemo
      title="ScrollArea"
      description="Область с прокруткой для длинного контента"
      usages={usages}
      preview={
        <ScrollArea className="h-72 w-48 rounded-md border">
          <div className="p-4">
            <h4 className="mb-4 text-sm font-medium leading-none">Теги</h4>
            {tags.map((tag) => (
              <div key={tag} className="text-sm py-1">
                {tag}
              </div>
            ))}
          </div>
        </ScrollArea>
      }
      code={code}
    />
  );
}
