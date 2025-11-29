'use client';

import { useState } from 'react';
import { ComponentDemo } from '../component-demo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { DatePicker } from '@/components/ui/date-picker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ru } from 'date-fns/locale';
import { UsageItem } from '../usage-info';

interface DemoProps {
  usages?: UsageItem[];
}

export function ButtonDemo({ usages }: DemoProps) {
  const [variant, setVariant] = useState<'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'>('default');
  const [size, setSize] = useState<'default' | 'sm' | 'lg' | 'icon'>('default');
  const [disabled, setDisabled] = useState(false);

  const code = `<Button variant="${variant}" size="${size}"${disabled ? ' disabled' : ''}>
  Кнопка
</Button>`;

  return (
    <ComponentDemo
      title="Button"
      description="Кнопки различных стилей и размеров"
      usages={usages}
      preview={
        <Button variant={variant} size={size} disabled={disabled}>
          Кнопка
        </Button>
      }
      code={code}
      controls={
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Вариант</Label>
            <Select value={variant} onValueChange={(v: any) => setVariant(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="destructive">Destructive</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Размер</Label>
            <Select value={size} onValueChange={(v: any) => setSize(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="icon">Icon</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="button-disabled"
              checked={disabled}
              onCheckedChange={(checked) => setDisabled(checked as boolean)}
            />
            <Label htmlFor="button-disabled" className="cursor-pointer">
              Disabled
            </Label>
          </div>
        </div>
      }
    />
  );
}

export function InputDemo({ usages }: DemoProps) {
  const [type, setType] = useState<'text' | 'email' | 'password' | 'number'>('text');
  const [placeholder, setPlaceholder] = useState('Введите текст...');
  const [disabled, setDisabled] = useState(false);

  const code = `<Input
  type="${type}"
  placeholder="${placeholder}"${disabled ? '\n  disabled' : ''}
/>`;

  return (
    <ComponentDemo
      title="Input"
      description="Текстовые поля ввода"
      usages={usages}
      preview={
        <div className="w-full max-w-sm">
          <Input type={type} placeholder={placeholder} disabled={disabled} />
        </div>
      }
      code={code}
      controls={
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="password">Password</SelectItem>
                <SelectItem value="number">Number</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="input-disabled"
              checked={disabled}
              onCheckedChange={(checked) => setDisabled(checked as boolean)}
            />
            <Label htmlFor="input-disabled" className="cursor-pointer">
              Disabled
            </Label>
          </div>
        </div>
      }
    />
  );
}

export function TextareaDemo({ usages }: DemoProps) {
  const [disabled, setDisabled] = useState(false);
  const [placeholder, setPlaceholder] = useState('Введите многострочный текст...');

  const code = `<Textarea
  placeholder="${placeholder}"${disabled ? '\n  disabled' : ''}
/>`;

  return (
    <ComponentDemo
      title="Textarea"
      description="Многострочное текстовое поле"
      usages={usages}
      preview={
        <div className="w-full max-w-sm">
          <Textarea placeholder={placeholder} disabled={disabled} />
        </div>
      }
      code={code}
      controls={
        <div className="flex items-center space-x-2">
          <Checkbox
            id="textarea-disabled"
            checked={disabled}
            onCheckedChange={(checked) => setDisabled(checked as boolean)}
          />
          <Label htmlFor="textarea-disabled" className="cursor-pointer">
            Disabled
          </Label>
        </div>
      }
    />
  );
}

export function CheckboxDemo({ usages }: DemoProps) {
  const [disabled, setDisabled] = useState(false);
  const [checked, setChecked] = useState(false);

  const code = `<div className="flex items-center space-x-2">
  <Checkbox
    id="terms"${checked ? '\n    checked' : ''}${disabled ? '\n    disabled' : ''}
  />
  <Label htmlFor="terms">Принимаю условия</Label>
</div>`;

  return (
    <ComponentDemo
      title="Checkbox"
      description="Чекбоксы для выбора опций"
      usages={usages}
      preview={
        <div className="flex items-center space-x-2">
          <Checkbox
            id="demo-checkbox"
            checked={checked}
            onCheckedChange={(c) => setChecked(c as boolean)}
            disabled={disabled}
          />
          <Label htmlFor="demo-checkbox" className="cursor-pointer">
            Принимаю условия
          </Label>
        </div>
      }
      code={code}
      controls={
        <div className="flex items-center space-x-2">
          <Checkbox
            id="checkbox-disabled"
            checked={disabled}
            onCheckedChange={(checked) => setDisabled(checked as boolean)}
          />
          <Label htmlFor="checkbox-disabled" className="cursor-pointer">
            Disabled
          </Label>
        </div>
      }
    />
  );
}

export function SelectDemo({ usages }: DemoProps) {
  const [disabled, setDisabled] = useState(false);

  const code = `<Select${disabled ? ' disabled' : ''}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Выберите опцию" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Опция 1</SelectItem>
    <SelectItem value="option2">Опция 2</SelectItem>
    <SelectItem value="option3">Опция 3</SelectItem>
  </SelectContent>
</Select>`;

  return (
    <ComponentDemo
      title="Select"
      description="Выпадающий список"
      usages={usages}
      preview={
        <Select disabled={disabled}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Выберите опцию" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Опция 1</SelectItem>
            <SelectItem value="option2">Опция 2</SelectItem>
            <SelectItem value="option3">Опция 3</SelectItem>
          </SelectContent>
        </Select>
      }
      code={code}
      controls={
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-disabled"
            checked={disabled}
            onCheckedChange={(checked) => setDisabled(checked as boolean)}
          />
          <Label htmlFor="select-disabled" className="cursor-pointer">
            Disabled
          </Label>
        </div>
      }
    />
  );
}

export function CalendarDemo({ usages }: DemoProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const code = `<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  locale={ru}
  className="rounded-md border"
/>`;

  return (
    <ComponentDemo
      title="Calendar"
      description="Компонент выбора даты в виде календаря"
      usages={usages}
      preview={
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          locale={ru}
          className="rounded-md border"
        />
      }
      code={code}
    />
  );
}

export function DatePickerDemo({ usages }: DemoProps) {
  const [date, setDate] = useState<Date | undefined>();

  const code = `<DatePicker
  value={date}
  onChange={setDate}
  placeholder="Выберите дату"
/>`;

  return (
    <ComponentDemo
      title="DatePicker"
      description="Поле ввода с выбором даты из календаря"
      usages={usages}
      preview={
        <div className="w-[280px]">
          <DatePicker
            value={date}
            onChange={setDate}
            placeholder="Выберите дату"
          />
        </div>
      }
      code={code}
    />
  );
}

export function RadioGroupDemo({ usages }: DemoProps) {
  const [value, setValue] = useState('option1');

  const code = `<RadioGroup value="${value}" onValueChange={setValue}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="r1" />
    <Label htmlFor="r1">Опция 1</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option2" id="r2" />
    <Label htmlFor="r2">Опция 2</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option3" id="r3" />
    <Label htmlFor="r3">Опция 3</Label>
  </div>
</RadioGroup>`;

  return (
    <ComponentDemo
      title="RadioGroup"
      description="Группа радио-кнопок для выбора одного варианта"
      usages={usages}
      preview={
        <RadioGroup value={value} onValueChange={setValue}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option1" id="r1" />
            <Label htmlFor="r1">Опция 1</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option2" id="r2" />
            <Label htmlFor="r2">Опция 2</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option3" id="r3" />
            <Label htmlFor="r3">Опция 3</Label>
          </div>
        </RadioGroup>
      }
      code={code}
    />
  );
}

export function SwitchDemo({ usages }: DemoProps) {
  const [checked, setChecked] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const code = `<div className="flex items-center space-x-2">
  <Switch
    id="airplane-mode"${checked ? '\n    checked' : ''}${disabled ? '\n    disabled' : ''}
    onCheckedChange={setChecked}
  />
  <Label htmlFor="airplane-mode">Режим полета</Label>
</div>`;

  return (
    <ComponentDemo
      title="Switch"
      description="Переключатель для вкл/выкл опций"
      usages={usages}
      preview={
        <div className="flex items-center space-x-2">
          <Switch
            id="airplane-mode"
            checked={checked}
            onCheckedChange={setChecked}
            disabled={disabled}
          />
          <Label htmlFor="airplane-mode">Режим полета</Label>
        </div>
      }
      code={code}
      controls={
        <div className="flex items-center space-x-2">
          <Checkbox
            id="switch-disabled"
            checked={disabled}
            onCheckedChange={(c) => setDisabled(c as boolean)}
          />
          <Label htmlFor="switch-disabled" className="cursor-pointer">
            Disabled
          </Label>
        </div>
      }
    />
  );
}

const formSchema = z.object({
  username: z.string().min(2, { message: 'Минимум 2 символа' }),
  email: z.string().email({ message: 'Некорректный email' }),
});

export function FormDemo({ usages }: DemoProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  const code = `const formSchema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
});

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
});

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="username"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Имя пользователя</FormLabel>
          <FormControl>
            <Input placeholder="username" {...field} />
          </FormControl>
          <FormDescription>Ваше отображаемое имя</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">Отправить</Button>
  </form>
</Form>`;

  return (
    <ComponentDemo
      title="Form"
      description="Компоненты формы с валидацией через react-hook-form и zod"
      usages={usages}
      preview={
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full max-w-sm">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя пользователя</FormLabel>
                  <FormControl>
                    <Input placeholder="username" {...field} />
                  </FormControl>
                  <FormDescription>Ваше отображаемое имя</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Отправить</Button>
          </form>
        </Form>
      }
      code={code}
    />
  );
}
