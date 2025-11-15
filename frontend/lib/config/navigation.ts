import {
  LayoutDashboard,
  Users,
  Calendar,
  Building2,
  GraduationCap,
  Users2,
  Shapes,
  CalendarDays,
  Settings,
  Receipt,
  FileText,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  description?: string;
  requiresAdmin?: boolean; // Доступно только для ADMIN
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navigationConfig: NavGroup[] = [
  {
    title: 'Главное',
    items: [
      {
        title: 'Расписание',
        href: '/schedule',
        icon: Calendar,
        description: 'Сквозное расписание занятий и аренд',
      },
      {
        title: 'Клиенты',
        href: '/clients',
        icon: Users,
        description: 'CRM - Управление клиентами',
      },
      {
        title: 'Абонементы',
        href: '/subscriptions',
        icon: Receipt,
        description: 'Управление абонементами клиентов',
      },
    ],
  },
  {
    title: 'Администрирование',
    items: [
      {
        title: 'Помещения',
        href: '/admin/rooms',
        icon: Building2,
        description: 'Справочник помещений',
        requiresAdmin: false, // Доступно всем (на чтение для менеджеров)
      },
      {
        title: 'Преподаватели',
        href: '/admin/teachers',
        icon: GraduationCap,
        description: 'Справочник преподавателей',
        requiresAdmin: false,
      },
      {
        title: 'Студии',
        href: '/admin/studios',
        icon: Shapes,
        description: 'Студии и секции',
        requiresAdmin: false,
      },
      {
        title: 'Группы',
        href: '/admin/groups',
        icon: Users2,
        description: 'Группы студий',
        requiresAdmin: false,
      },
      {
        title: 'Типы мероприятий',
        href: '/admin/event-types',
        icon: CalendarDays,
        description: 'Справочник типов мероприятий',
        requiresAdmin: true, // Только для админа
      },
      {
        title: 'Мероприятия',
        href: '/admin/events',
        icon: CalendarDays,
        description: 'Управление мероприятиями',
        requiresAdmin: false,
      },
    ],
  },
  {
    title: 'Отчеты и настройки',
    items: [
      {
        title: 'Отчеты',
        href: '/reports',
        icon: FileText,
        description: 'Финансовые отчеты и аналитика',
        requiresAdmin: true, // Только для админа
      },
      {
        title: 'Настройки',
        href: '/settings',
        icon: Settings,
        description: 'Настройки системы',
        requiresAdmin: true, // Только для админа
      },
    ],
  },
];

// Функция для фильтрации навигации по роли
export function filterNavigationByRole(
  navigation: NavGroup[],
  isAdmin: boolean
): NavGroup[] {
  return navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // Если требуется admin, показываем только для админов
        if (item.requiresAdmin) {
          return isAdmin;
        }
        // Иначе показываем всем
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0); // Убираем пустые группы
}
