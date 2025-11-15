# Документация по навигации

**Дата создания:** 2025-11-15
**Версия:** 1.0.0

---

## Оглавление

1. [Обзор](#обзор)
2. [Архитектура](#архитектура)
3. [Компоненты](#компоненты)
4. [Конфигурация](#конфигурация)
5. [Использование](#использование)
6. [Адаптивность](#адаптивность)
7. [Кастомизация](#кастомизация)

---

## Обзор

Система навигации проекта построена на основе **вертикальной боковой панели** (Sidebar) с дополнительной **верхней панелью** (TopBar). Реализация обеспечивает современный UX с полной адаптивностью для всех устройств.

### Ключевые особенности

- **Сворачиваемая боковая панель** с иконками
- **Breadcrumbs** для отображения текущего пути
- **Глобальный поиск** (⌘K / Ctrl+K)
- **Профиль пользователя** с dropdown меню
- **Мобильная версия** с drawer (выдвижная панель)
- **Фильтрация навигации по ролям** (ADMIN/MANAGER)
- **Состояние сохраняется** в localStorage (Zustand persist)

---

## Архитектура

```
┌─────────────────────────────────────────────────────┐
│                   TopBar                             │
│  [Menu] [Breadcrumbs]     [Search]  [UserNav]      │
└─────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────┐
│          │                                           │
│          │                                           │
│ Sidebar  │             Page Content                 │
│  (Desktop│                                           │
│   only)  │                                           │
│          │                                           │
│          │                                           │
└──────────┴──────────────────────────────────────────┘

Mobile:
┌─────────────────────────────────────────────────────┐
│ TopBar: [☰]              [Search]  [Avatar]         │
├─────────────────────────────────────────────────────┤
│                                                      │
│              Page Content (Full Width)              │
│                                                      │
└─────────────────────────────────────────────────────┘
(Drawer выдвигается слева по клику на ☰)
```

---

## Компоненты

### 1. Sidebar (`frontend/components/navigation/sidebar.tsx`)

**Описание**: Вертикальная боковая панель для desktop версии.

**Особенности**:
- Отображается только на `md:` и выше (≥768px)
- Две ширины: 240px (развернутая) и 60px (свернутая)
- Группировка пунктов меню
- Активное состояние для текущего маршрута
- Кнопка сворачивания внизу

**Пропсы**: Нет (использует Zustand store)

**Пример использования**:
```tsx
import { Sidebar } from '@/components/navigation/sidebar';

<Sidebar />
```

---

### 2. MobileSidebar (`frontend/components/navigation/mobile-sidebar.tsx`)

**Описание**: Мобильная версия навигации с drawer (Sheet компонент).

**Особенности**:
- Использует компонент `Sheet` от shadcn/ui
- Открывается по кнопке "гамбургер" в TopBar
- Автоматически закрывается при переходе на другую страницу
- Полноценная навигация с группировкой

**Пропсы**: Нет (использует Zustand store)

**Пример использования**:
```tsx
import { MobileSidebar } from '@/components/navigation/mobile-sidebar';

<MobileSidebar />
```

---

### 3. TopBar (`frontend/components/navigation/topbar.tsx`)

**Описание**: Верхняя панель с breadcrumbs, поиском и профилем.

**Особенности**:
- Sticky позиционирование (всегда сверху)
- Кнопка мобильного меню (только на mobile)
- Breadcrumbs (только на desktop)
- Глобальный поиск
- Профиль пользователя

**Пропсы**:
```tsx
interface TopBarProps {
  sidebarCollapsed: boolean;
}
```

**Пример использования**:
```tsx
import { TopBar } from '@/components/navigation/topbar';

<TopBar sidebarCollapsed={false} />
```

---

### 4. Breadcrumbs (`frontend/components/navigation/breadcrumbs.tsx`)

**Описание**: Хлебные крошки для отображения текущего пути.

**Особенности**:
- Автоматическая генерация на основе pathname
- Использует конфигурацию навигации для названий
- Поддержка dynamic routes
- Иконка "Домой" для главной страницы

**Пропсы**: Нет (использует `usePathname()`)

**Пример**:
```
[🏠] > Клиенты > Иван Иванов
```

---

### 5. GlobalSearch (`frontend/components/navigation/global-search.tsx`)

**Описание**: Глобальный поиск с Command компонентом.

**Особенности**:
- Горячая клавиша: `⌘K` (Mac) или `Ctrl+K` (Windows/Linux)
- Поиск по страницам
- Быстрые действия
- Fuzzy search (планируется)

**Пропсы**: Нет

**Пример**:
```tsx
import { GlobalSearch } from '@/components/navigation/global-search';

<GlobalSearch />
```

**Расширение**: Добавьте свои быстрые действия в компоненте.

---

### 6. UserNav (`frontend/components/navigation/user-nav.tsx`)

**Описание**: Профиль пользователя с dropdown меню.

**Особенности**:
- Аватар с инициалами
- Dropdown меню с информацией о пользователе
- Роль пользователя (бейдж)
- Ссылки на профиль и настройки
- Кнопка выхода

**Пропсы**: Нет (использует `useAuth()`)

---

## Конфигурация

### Навигационное меню (`frontend/lib/config/navigation.ts`)

Вся навигация конфигурируется в одном месте:

```typescript
export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string; // Опциональный бейдж (например, "NEW")
  description?: string;
  requiresAdmin?: boolean; // Доступ только для ADMIN
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
        title: 'Панель управления',
        href: '/dashboard',
        icon: LayoutDashboard,
        description: 'Главная страница с общей статистикой',
      },
      // ...
    ],
  },
  // ...
];
```

### Добавление нового пункта меню

1. Откройте `frontend/lib/config/navigation.ts`
2. Добавьте новый `NavItem` в соответствующую группу:

```typescript
{
  title: 'Новый раздел',
  href: '/new-section',
  icon: FileText, // Импортируйте из lucide-react
  description: 'Описание нового раздела',
  requiresAdmin: false, // true для админов
}
```

3. Навигация автоматически обновится на всех устройствах

### Фильтрация по ролям

Функция `filterNavigationByRole()` автоматически фильтрует пункты меню:
- Если `requiresAdmin: true` → показывается только админам
- Иначе → показывается всем

---

## Использование

### В Layout

```tsx
// frontend/app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/navigation/sidebar';
import { MobileSidebar } from '@/components/navigation/mobile-sidebar';
import { TopBar } from '@/components/navigation/topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useNavigationStore();

  return (
    <div className="relative h-screen overflow-hidden">
      <Sidebar />
      <MobileSidebar />

      <div className={cn(
        'flex h-screen flex-col transition-all duration-300',
        sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
      )}>
        <TopBar sidebarCollapsed={sidebarCollapsed} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## Адаптивность

### Breakpoints

| Устройство | Breakpoint | Ширина | Навигация |
|------------|------------|--------|-----------|
| Mobile | < md | < 768px | Drawer (выдвижная панель) |
| Tablet | md | ≥ 768px | Sidebar (сворачиваемая) |
| Desktop | lg+ | ≥ 1024px | Sidebar (полноценная) |

### Поведение на разных устройствах

#### Desktop (≥768px)
- Sidebar видна всегда (слева)
- Можно свернуть/развернуть
- Breadcrumbs видны в TopBar
- Полноценная навигация

#### Mobile (<768px)
- Sidebar скрыта
- Drawer (Sheet) открывается по кнопке "☰"
- Breadcrumbs скрыты (экономия места)
- Поиск и профиль в TopBar

---

## Глобальное состояние (Zustand)

### Navigation Store (`frontend/lib/stores/navigation-store.ts`)

```typescript
interface NavigationStore {
  sidebarCollapsed: boolean; // Состояние Sidebar (свернут/развернут)
  toggleSidebar: () => void; // Переключить состояние
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileMenuOpen: boolean; // Состояние мобильного меню
  setMobileMenuOpen: (open: boolean) => void;
}
```

**Persist**: Состояние `sidebarCollapsed` сохраняется в `localStorage`, чтобы при перезагрузке страницы состояние восстанавливалось.

### Использование

```tsx
import { useNavigationStore } from '@/lib/stores/navigation-store';

const { sidebarCollapsed, toggleSidebar } = useNavigationStore();

// Переключить sidebar
toggleSidebar();

// Установить состояние напрямую
setSidebarCollapsed(true); // Свернуть
```

---

## Кастомизация

### Изменение ширины Sidebar

В `sidebar.tsx` измените классы:

```tsx
className={cn(
  'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300',
  sidebarCollapsed ? 'w-16' : 'w-64', // <-- здесь
  'hidden md:block'
)}
```

### Изменение цвета активного пункта

В `sidebar.tsx` и `mobile-sidebar.tsx`:

```tsx
className={cn(
  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
  isActive
    ? 'bg-primary text-primary-foreground' // <-- здесь
    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
)}
```

### Добавление бейджей к пунктам меню

В конфигурации навигации:

```typescript
{
  title: 'Абонементы',
  href: '/subscriptions',
  icon: Receipt,
  badge: 'NEW', // <-- Бейдж
}
```

Бейдж автоматически отобразится справа от названия.

---

## Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| `⌘K` / `Ctrl+K` | Открыть глобальный поиск |

Планируется добавить:
- `⌘B` / `Ctrl+B` - Свернуть/развернуть Sidebar
- `⌘/` / `Ctrl+/` - Список горячих клавиш

---

## Доступность (Accessibility)

Все компоненты навигации соответствуют стандартам **WCAG 2.1**:

- **Keyboard navigation**: Навигация с клавиатуры (Tab, Enter, Esc)
- **ARIA labels**: Все интерактивные элементы имеют aria-label
- **Focus indicators**: Видимая обводка при фокусе
- **Screen reader friendly**: Поддержка скринридеров

---

## Примеры использования

### Программная навигация

```tsx
import { useRouter } from 'next/navigation';

const router = useRouter();

// Перейти на страницу
router.push('/clients');
```

### Проверка активного маршрута

```tsx
import { usePathname } from 'next/navigation';

const pathname = usePathname();
const isActive = pathname === '/clients';
```

---

## Решение проблем

### Sidebar не отображается
- Проверьте, что вы находитесь в `(dashboard)` группе роутов
- Убедитесь, что пользователь авторизован
- Проверьте breakpoint (Sidebar скрыта на < md)

### Мобильное меню не открывается
- Проверьте, что `MobileSidebar` подключен в Layout
- Проверьте Zustand store (`setMobileMenuOpen`)

### Breadcrumbs не появляются
- Breadcrumbs скрыты на главной странице (`/dashboard`)
- Breadcrumbs скрыты на мобильных устройствах (< md)

---

## Будущие улучшения

- [ ] Добавить анимации переходов между страницами
- [ ] Реализовать полноценный глобальный поиск с результатами
- [ ] Добавить недавно посещенные страницы
- [ ] Поддержка избранных разделов
- [ ] Темная/светлая тема
- [ ] Больше горячих клавиш

---

## Связанные файлы

**Компоненты**:
- `frontend/components/navigation/sidebar.tsx`
- `frontend/components/navigation/mobile-sidebar.tsx`
- `frontend/components/navigation/topbar.tsx`
- `frontend/components/navigation/breadcrumbs.tsx`
- `frontend/components/navigation/global-search.tsx`
- `frontend/components/navigation/user-nav.tsx`

**Конфигурация**:
- `frontend/lib/config/navigation.ts`
- `frontend/lib/stores/navigation-store.ts`

**Layout**:
- `frontend/app/(dashboard)/layout.tsx`

**UI компоненты** (shadcn/ui):
- `frontend/components/ui/sheet.tsx`
- `frontend/components/ui/command.tsx`
- `frontend/components/ui/dropdown-menu.tsx`
- `frontend/components/ui/avatar.tsx`
- `frontend/components/ui/badge.tsx`

---

**Автор**: Claude Code
**Дата последнего обновления**: 2025-11-15
