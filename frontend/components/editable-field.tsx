'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, Loader2, Pencil } from 'lucide-react';

export type EditableFieldType = 'text' | 'email' | 'tel' | 'date' | 'textarea' | 'select';

export interface EditableFieldOption {
  value: string;
  label: string;
}

export interface EditableFieldProps {
  label: string;
  value: string | null | undefined;
  type?: EditableFieldType;
  options?: EditableFieldOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  validate?: (value: string) => boolean | string;
  onSave: (value: string | null) => Promise<void>;
  formatDisplay?: (value: string | null | undefined) => string;
  className?: string;
  rows?: number;
  allowNull?: boolean;
}

export function EditableField({
  label,
  value,
  type = 'text',
  options = [],
  placeholder,
  disabled = false,
  required = false,
  validate,
  onSave,
  formatDisplay,
  className,
  rows = 3,
  allowNull = true,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value ?? '');
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type !== 'textarea') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleStartEdit = () => {
    if (disabled) return;
    setEditValue(value ?? '');
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value ?? '');
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();

    // Validation
    if (required && !trimmedValue) {
      setError('Поле обязательно для заполнения');
      return;
    }

    if (validate && trimmedValue) {
      const validationResult = validate(trimmedValue);
      if (validationResult !== true) {
        setError(typeof validationResult === 'string' ? validationResult : 'Некорректное значение');
        return;
      }
    }

    // Don't save if value hasn't changed
    if (trimmedValue === (value ?? '')) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(trimmedValue || (allowNull ? null : ''));
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    }
  };

  const displayValue = formatDisplay
    ? formatDisplay(value)
    : value || '—';

  if (isEditing) {
    return (
      <div className={cn('space-y-2', className)}>
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="space-y-1">
          <div className="flex gap-2">
            {type === 'textarea' ? (
              <Textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={rows}
                disabled={isSaving}
                className="flex-1"
              />
            ) : type === 'select' ? (
              <Select value={editValue || '__empty__'} onValueChange={(v) => setEditValue(v === '__empty__' ? '' : v)} disabled={isSaving}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {allowNull && (
                    <SelectItem value="__empty__">Не указано</SelectItem>
                  )}
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : type === 'tel' ? (
              <PhoneInput
                ref={inputRef as React.RefObject<HTMLInputElement>}
                value={editValue}
                onChange={(value) => setEditValue(value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || '+7 (999) 123-45-67'}
                disabled={isSaving}
                className="flex-1"
              />
            ) : (
              <Input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isSaving}
                className="flex-1"
              />
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="shrink-0"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isSaving}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </dd>
      </div>
    );
  }

  return (
    <div className={cn('group', className)}>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd
        onClick={handleStartEdit}
        className={cn(
          'text-sm mt-1 min-h-[1.5rem] flex items-center gap-2',
          !disabled && 'cursor-pointer rounded-md px-2 py-1 -mx-2 -my-1',
          !disabled && 'hover:bg-accent/50 transition-colors',
          !disabled && 'group-hover:ring-1 group-hover:ring-ring/20'
        )}
        role={!disabled ? 'button' : undefined}
        tabIndex={!disabled ? 0 : undefined}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleStartEdit();
          }
        }}
      >
        <span className="flex-1">{displayValue}</span>
        {!disabled && (
          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
        )}
      </dd>
    </div>
  );
}
