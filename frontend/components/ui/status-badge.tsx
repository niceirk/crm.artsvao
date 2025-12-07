'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { StatusSemantic, StatusConfig } from '@/lib/constants/status';

/**
 * Единый компонент для отображения статусов
 *
 * Стиль: Мягкий с границей (светлый фон + тёмный текст + граница)
 * Иконки: Всегда отображаются рядом с текстом
 *
 * @example
 * // Простое использование с конфигурацией
 * <StatusBadge config={INVOICE_STATUS_CONFIG[invoice.status]} />
 *
 * // С размером
 * <StatusBadge config={config} size="sm" />
 *
 * // Ручное указание параметров
 * <StatusBadge semantic="success" icon={CheckCircle}>Активен</StatusBadge>
 */

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors',
  {
    variants: {
      semantic: {
        success:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        warning:
          'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
        error:
          'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
        info:
          'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
        neutral:
          'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
      },
      size: {
        sm: 'px-1.5 py-0 text-[10px] h-5',
        default: 'px-2 py-0.5 text-xs h-6',
        lg: 'px-2.5 py-1 text-sm h-7',
      },
    },
    defaultVariants: {
      semantic: 'neutral',
      size: 'default',
    },
  }
);

export interface StatusBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof statusBadgeVariants> {
  /** Конфигурация статуса из констант */
  config?: StatusConfig;
  /** Иконка (переопределяет config.icon) */
  icon?: LucideIcon;
  /** Текст статуса (переопределяет config.label) */
  children?: React.ReactNode;
  /** Семантика (переопределяет config.semantic) */
  semantic?: StatusSemantic;
  /** Анимировать иконку (для loading состояний) */
  animate?: boolean;
}

export function StatusBadge({
  className,
  config,
  icon: iconProp,
  children,
  semantic: semanticProp,
  size,
  animate = false,
  ...props
}: StatusBadgeProps) {
  // Используем значения из config или переопределённые пропсы
  const semantic = semanticProp ?? config?.semantic ?? 'neutral';
  const Icon = iconProp ?? config?.icon;
  const label = children ?? config?.label;

  // Размер иконки в зависимости от размера badge
  const iconSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;

  return (
    <span
      className={cn(statusBadgeVariants({ semantic, size }), className)}
      {...props}
    >
      {Icon && (
        <Icon
          className={cn('shrink-0', animate && 'animate-spin')}
          size={iconSize}
        />
      )}
      {label}
    </span>
  );
}

// === Типизированные компоненты для конкретных сущностей ===

import {
  INVOICE_STATUS_CONFIG,
  SUBSCRIPTION_STATUS_CONFIG,
  RENTAL_APPLICATION_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  CLIENT_STATUS_CONFIG,
  ATTENDANCE_STATUS_CONFIG,
  NOTIFICATION_STATUS_CONFIG,
} from '@/lib/constants/status';

export interface EntityStatusBadgeProps
  extends Omit<StatusBadgeProps, 'config' | 'children' | 'semantic' | 'icon'> {
  status: string;
}

/** Статус счёта */
export function InvoiceStatusBadge({ status, ...props }: EntityStatusBadgeProps) {
  const config = INVOICE_STATUS_CONFIG[status];
  return <StatusBadge config={config} {...props} />;
}

/** Статус абонемента */
export function SubscriptionStatusBadge({ status, ...props }: EntityStatusBadgeProps) {
  const config = SUBSCRIPTION_STATUS_CONFIG[status];
  return <StatusBadge config={config} {...props} />;
}

/** Статус заявки на аренду */
export function RentalStatusBadge({ status, ...props }: EntityStatusBadgeProps) {
  const config = RENTAL_APPLICATION_STATUS_CONFIG[status];
  return <StatusBadge config={config} {...props} />;
}

/** Статус платежа */
export function PaymentStatusBadge({ status, ...props }: EntityStatusBadgeProps) {
  const config = PAYMENT_STATUS_CONFIG[status];
  return <StatusBadge config={config} {...props} />;
}

/** Статус клиента */
export function ClientStatusBadge({ status, ...props }: EntityStatusBadgeProps) {
  const config = CLIENT_STATUS_CONFIG[status];
  return <StatusBadge config={config} {...props} />;
}

/** Статус посещаемости */
export function AttendanceStatusBadge({ status, ...props }: EntityStatusBadgeProps) {
  const config = ATTENDANCE_STATUS_CONFIG[status];
  return <StatusBadge config={config} {...props} />;
}

/** Статус уведомления */
export function NotificationStatusBadge({ status, ...props }: EntityStatusBadgeProps) {
  const config = NOTIFICATION_STATUS_CONFIG[status];
  // Анимация для статуса PROCESSING
  return <StatusBadge config={config} animate={status === 'PROCESSING'} {...props} />;
}

export { statusBadgeVariants };
