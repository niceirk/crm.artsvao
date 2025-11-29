'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navigationConfig } from '@/lib/config/navigation';
import { useBreadcrumbs } from '@/lib/contexts/breadcrumbs-context';

interface BreadcrumbItem {
  label: string;
  href: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const { customTitle } = useBreadcrumbs();
  const breadcrumbs = generateBreadcrumbs(pathname, customTitle);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm">
      <Link
        href="/room-planner"
        className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Главная</span>
      </Link>

      {breadcrumbs.map((breadcrumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={breadcrumb.href} className="flex items-center space-x-1">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {isLast ? (
              <span className="font-medium text-foreground">{breadcrumb.label}</span>
            ) : (
              <Link
                href={breadcrumb.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {breadcrumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function generateBreadcrumbs(pathname: string, customTitle: string | null = null): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];

  // Исключаем главную страницу (room-planner - это новая "домашняя" страница)
  if (pathname === '/room-planner' || pathname === '/schedule' || pathname === '/dashboard' || pathname === '/') {
    return breadcrumbs;
  }

  // Страницы, которые принадлежат разделу "Настройки системы"
  const settingsChildPages: Record<string, string> = {
    '/admin/telephony': 'Телефония',
    '/admin/notifications': 'Уведомления',
    '/design-system': 'Дизайн-система',
  };

  // Если это страница из раздела "Настройки системы", добавляем родительскую крошку
  if (settingsChildPages[pathname]) {
    breadcrumbs.push({
      label: 'Настройки системы',
      href: '/settings',
    });
    breadcrumbs.push({
      label: settingsChildPages[pathname],
      href: pathname,
    });
    return breadcrumbs;
  }

  // Специальные пути с кастомной иерархией хлебных крошек
  const specialPaths: Record<string, BreadcrumbItem[]> = {
    '/integrations/pyrus': [
      { label: 'Настройки', href: '/admin' },
      { label: 'Мероприятия', href: '/admin/events' },
      { label: 'Импорт из Pyrus', href: '/integrations/pyrus' },
    ],
  };

  // Если это специальный путь, возвращаем его крошки
  if (specialPaths[pathname]) {
    return specialPaths[pathname];
  }

  const segments = pathname.split('/').filter(Boolean);
  let currentPath = '';
  let hasDetailPage = false;

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Пропускаем UUID/ID сегменты (динамические роуты)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
    const isNumericId = /^\d+$/.test(segment);

    if (isUUID || isNumericId) {
      hasDetailPage = true;
      return; // Пропускаем этот сегмент
    }

    // Специальная обработка для сегмента "new" (создание нового элемента)
    if (segment === 'new') {
      const newLabels: Record<string, string> = {
        '/clients/new': 'Новый клиент',
        '/medical-certificates/new': 'Новая справка',
      };
      const label = newLabels[currentPath] || 'Новый';
      breadcrumbs.push({
        label,
        href: currentPath,
      });
      return;
    }

    // Ищем название в конфигурации навигации
    const navItem = findNavItemByPath(currentPath);

    if (navItem) {
      breadcrumbs.push({
        label: navItem.title,
        href: currentPath,
      });
    } else {
      // Специальная обработка для известных путей
      const knownPaths: Record<string, string> = {
        '/groups': 'Группы',
        '/studios': 'Студии',
        '/clients': 'Клиенты',
        '/admin': 'Настройки',
        '/settings': 'Настройки системы',
        '/profile': 'Профиль',
        '/integrations': 'Интеграции',
      };

      const label = knownPaths[currentPath] || formatSegment(segment);
      breadcrumbs.push({
        label,
        href: currentPath,
      });
    }
  });

  // Если есть кастомный заголовок и это страница детальной информации, добавляем его в конец
  if (customTitle && hasDetailPage) {
    breadcrumbs.push({
      label: customTitle,
      href: pathname,
    });
  }

  return breadcrumbs;
}

function findNavItemByPath(path: string) {
  for (const group of navigationConfig) {
    // Проверяем прямые элементы
    const item = group.items.find((item) => item.href === path);
    if (item) {
      return item;
    }

    // Проверяем children
    for (const item of group.items) {
      if (item.children) {
        const childItem = item.children.find((child) => child.href === path);
        if (childItem) {
          return childItem;
        }
      }
    }
  }
  return null;
}

function formatSegment(segment: string): string {
  // Словарь переводов для известных сегментов
  const segmentTranslations: Record<string, string> = {
    'medical-certificates': 'Справки',
    'subscription-types': 'Типы абонементов',
    'event-types': 'Типы мероприятий',
    'benefit-categories': 'Льготные категории',
    'room-planner': 'Планировщик помещений',
    'schedule-planner': 'Расписание',
    'profile': 'Профиль',
    'new': 'Новый',
    'integrations': 'Интеграции',
    'pyrus': 'Pyrus',
    'events': 'Мероприятия',
    'rooms': 'Помещения',
    'teachers': 'Преподаватели',
    'studios': 'Студии',
    'groups': 'Группы',
    'users': 'Пользователи',
    'reports': 'Отчеты',
    'settings': 'Настройки',
    'payments': 'Платежи',
    'invoices': 'Счета',
    'subscriptions': 'Абонементы',
    'timesheets': 'Табели',
    'messages': 'Сообщения',
    'nomenclature': 'Номенклатура',
  };

  if (segmentTranslations[segment]) {
    return segmentTranslations[segment];
  }

  // Фоллбэк: преобразуем сегмент из kebab-case в нормальный вид
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
