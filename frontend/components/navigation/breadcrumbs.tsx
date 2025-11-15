'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navigationConfig } from '@/lib/config/navigation';

interface BreadcrumbItem {
  label: string;
  href: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm">
      <Link
        href="/schedule"
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

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];

  // Исключаем главную страницу (расписание - это новая "домашняя" страница)
  if (pathname === '/schedule' || pathname === '/dashboard' || pathname === '/') {
    return breadcrumbs;
  }

  const segments = pathname.split('/').filter(Boolean);
  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Ищем название в конфигурации навигации
    const navItem = findNavItemByPath(currentPath);

    if (navItem) {
      breadcrumbs.push({
        label: navItem.title,
        href: currentPath,
      });
    } else {
      // Если не нашли в навигации, используем сегмент как есть (например, для dynamic routes)
      const label = formatSegment(segment);
      breadcrumbs.push({
        label,
        href: currentPath,
      });
    }
  });

  return breadcrumbs;
}

function findNavItemByPath(path: string) {
  for (const group of navigationConfig) {
    const item = group.items.find((item) => item.href === path);
    if (item) {
      return item;
    }
  }
  return null;
}

function formatSegment(segment: string): string {
  // Преобразуем сегмент из kebab-case в нормальный вид
  // Например: "event-types" -> "Event Types"
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
