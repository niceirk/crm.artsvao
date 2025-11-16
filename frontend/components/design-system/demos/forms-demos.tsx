'use client';

import { useState } from 'react';
import { ComponentDemo } from '../component-demo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ButtonDemo() {
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

export function InputDemo() {
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

export function TextareaDemo() {
  const [disabled, setDisabled] = useState(false);
  const [placeholder, setPlaceholder] = useState('Введите многострочный текст...');

  const code = `<Textarea
  placeholder="${placeholder}"${disabled ? '\n  disabled' : ''}
/>`;

  return (
    <ComponentDemo
      title="Textarea"
      description="Многострочное текстовое поле"
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

export function CheckboxDemo() {
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

export function SelectDemo() {
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
