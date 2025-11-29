'use client';

import Link from 'next/link';
import {
  Phone,
  Bell,
  Palette,
  Settings,
  ExternalLink,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface SettingsSection {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAdmin?: boolean;
}

const settingsSections: SettingsSection[] = [
  {
    title: 'Телефония',
    description: 'Настройки IP-телефонии Novofon, интеграция с CRM',
    href: '/admin/telephony',
    icon: Phone,
    requiresAdmin: true,
  },
  {
    title: 'Уведомления',
    description: 'Шаблоны, рассылки и история уведомлений',
    href: '/admin/notifications',
    icon: Bell,
    requiresAdmin: true,
  },
  {
    title: 'Design System',
    description: 'Библиотека компонентов и элементов дизайна',
    href: '/design-system',
    icon: Palette,
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Настройки системы</h1>
          <p className="text-muted-foreground">
            Конфигурация и расширенные настройки
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <section.icon className="h-8 w-8 text-muted-foreground" />
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
