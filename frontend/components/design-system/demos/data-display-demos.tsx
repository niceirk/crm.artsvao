'use client';

import { useState } from 'react';
import { ComponentDemo } from '../component-demo';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CardDemo() {
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

export function BadgeDemo() {
  const [variant, setVariant] = useState<'default' | 'secondary' | 'destructive' | 'outline'>('default');

  const code = `<Badge variant="${variant}">Значок</Badge>`;

  return (
    <ComponentDemo
      title="Badge"
      description="Значки для статусов и меток"
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

export function AvatarDemo() {
  const code = `<Avatar>
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>`;

  return (
    <ComponentDemo
      title="Avatar"
      description="Аватар пользователя"
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

export function TableDemo() {
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
