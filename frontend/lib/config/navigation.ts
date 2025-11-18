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
  CalendarClock,
  Palette,
  Percent,
  ClipboardList,
  FileStack,
  CreditCard,
  Download,
  type LucideIcon,
} from 'lucide-react';

// Интерфейс для подпунктов навигации
export interface NavSubItem {
  title: string;
  href: string;
  description?: string;
  requiresAdmin?: boolean;
}

export interface NavItem {
  title: string;
  href?: string; // Опциональный (для родителей с children)
  icon: LucideIcon;
  badge?: string;
  description?: string;
  requiresAdmin?: boolean; // Доступно только для ADMIN
  children?: NavSubItem[]; // Вложенные подпункты меню
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
        description: 'Просмотр и редактирование расписания',
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
      {
        title: 'Счета',
        href: '/invoices',
        icon: FileStack,
        description: 'Управление счетами',
      },
      {
        title: 'Платежи',
        href: '/payments',
        icon: CreditCard,
        description: 'Управление платежами',
      },
    ],
  },
  {
    title: 'Настройки',
    items: [
      {
        title: 'Помещения',
        href: '/admin/rooms',
        icon: Building2,
        description: 'Справочник помещений',
        requiresAdmin: false,
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
        title: 'Льготные категории',
        href: '/admin/benefit-categories',
        icon: Percent,
        description: 'Справочник льгот и скидок',
        requiresAdmin: true,
      },
      {
        title: 'Номенклатура услуг',
        href: '/admin/services',
        icon: ClipboardList,
        description: 'Справочник услуг с НДС',
        requiresAdmin: true,
      },
      {
        title: 'Типы абонементов',
        href: '/admin/subscription-types',
        icon: Receipt,
        description: 'Справочник типов абонементов',
        requiresAdmin: true,
      },
      {
        title: 'Мероприятия',
        icon: CalendarDays,
        description: 'Управление мероприятиями',
        children: [
          {
            title: 'Все мероприятия',
            href: '/admin/events',
            description: 'Список всех мероприятий',
          },
          {
            title: 'Типы мероприятий',
            href: '/admin/event-types',
            description: 'Справочник типов мероприятий',
            requiresAdmin: true,
          },
          {
            title: 'Импорт из Pyrus',
            href: '/integrations/pyrus',
            description: 'Импорт мероприятий из CRM Pyrus',
            requiresAdmin: true,
          },
        ],
      },
    ],
  },
  {
    title: 'Система',
    items: [
      {
        title: 'Design System',
        href: '/design-system',
        icon: Palette,
        description: 'Библиотека компонентов и элементов дизайна',
        requiresAdmin: false, // Доступно всем
      },
      {
        title: 'Отчеты',
        href: '/reports',
        icon: FileText,
        description: 'Финансовые отчеты и аналитика',
        requiresAdmin: true, // Только для админа
      },
      {
        title: 'Настройки системы',
        href: '/settings',
        icon: Settings,
        description: 'Конфигурация системы',
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
      items: group.items
        .map((item) => {
          // Если есть children, фильтруем их
          if (item.children) {
            const filteredChildren = item.children.filter((child) => {
              if (child.requiresAdmin) {
                return isAdmin;
              }
              return true;
            });

            // Если все children отфильтровались, скрываем родителя
            if (filteredChildren.length === 0) {
              return null;
            }

            return {
              ...item,
              children: filteredChildren,
            };
          }

          // Обычный элемент без children
          if (item.requiresAdmin) {
            return isAdmin ? item : null;
          }
          return item;
        })
        .filter((item): item is NavItem => item !== null),
    }))
    .filter((group) => group.items.length > 0); // Убираем пустые группы
}
