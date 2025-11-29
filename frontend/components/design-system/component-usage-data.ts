import { UsageItem } from './usage-info';

export const componentUsageData: Record<string, UsageItem[]> = {
  // Foundation - нет прямого использования (базовые стили)
  Colors: [],
  Typography: [],
  Spacing: [],
  BorderRadius: [],

  // Forms
  Button: [
    { path: '/login', label: 'Авторизация' },
    { path: '/clients', label: 'Клиенты' },
    { path: '/clients/new', label: 'Новый клиент' },
    { path: '/messages', label: 'Сообщения' },
    { path: '/invoices', label: 'Счета' },
    { path: '/studios', label: 'Студии' },
    { path: '/nomenclature', label: 'Номенклатура' },
    { path: '/payments', label: 'Платежи' },
    { path: '/timesheets', label: 'Табели' },
    { path: '/schedule-planner', label: 'Планировщик' },
    { path: '/medical-certificates', label: 'Мед. справки' },
    { path: '/profile', label: 'Профиль' },
  ],
  Input: [
    { path: '/login', label: 'Авторизация' },
    { path: '/clients', label: 'Клиенты' },
    { path: '/clients/new', label: 'Новый клиент' },
    { path: '/messages', label: 'Сообщения' },
    { path: '/invoices', label: 'Счета' },
    { path: '/studios', label: 'Студии' },
    { path: '/nomenclature', label: 'Номенклатура' },
    { path: '/payments', label: 'Платежи' },
    { path: '/schedule-planner', label: 'Планировщик' },
    { path: '/medical-certificates/new', label: 'Новая справка' },
  ],
  Textarea: [
    { path: '/clients/new', label: 'Новый клиент' },
    { path: '/studios', label: 'Студии' },
    { path: '/nomenclature', label: 'Номенклатура' },
    { path: '/schedule-planner', label: 'Планировщик' },
    { path: '/medical-certificates/new', label: 'Новая справка' },
  ],
  Checkbox: [
    { path: '/schedule-planner', label: 'Планировщик' },
    { path: '/medical-certificates/new', label: 'Новая справка' },
    { path: '/timesheets', label: 'Табели' },
  ],
  Select: [
    { path: '/clients/new', label: 'Новый клиент' },
    { path: '/clients', label: 'Клиенты' },
    { path: '/studios', label: 'Студии' },
    { path: '/nomenclature', label: 'Номенклатура' },
    { path: '/payments', label: 'Платежи' },
    { path: '/invoices', label: 'Счета' },
    { path: '/timesheets', label: 'Табели' },
    { path: '/schedule-planner', label: 'Планировщик' },
    { path: '/medical-certificates/new', label: 'Новая справка' },
  ],
  Calendar: [
    { path: '/schedule-planner', label: 'Планировщик' },
    { path: '/medical-certificates/new', label: 'Новая справка' },
    { path: '/clients/new', label: 'Новый клиент' },
  ],
  DatePicker: [
    { path: '/schedule-planner', label: 'Планировщик' },
    { path: '/clients/new', label: 'Новый клиент' },
    { path: '/clients', label: 'Фильтры клиентов' },
  ],
  RadioGroup: [],
  Switch: [
    { path: '/messages', label: 'Сообщения' },
  ],
  PhoneInput: [
    { path: '/clients/new', label: 'Новый клиент' },
    { path: '/clients', label: 'Редактирование клиента' },
  ],
  MultiSelect: [
    { path: '/admin/events', label: 'Мероприятия' },
  ],
  Form: [
    { path: '/schedule-planner', label: 'Планировщик' },
    { path: '/nomenclature', label: 'Номенклатура' },
    { path: '/clients/new', label: 'Новый клиент' },
  ],
  Combobox: [],

  // Data Display
  Card: [
    { path: '/login', label: 'Авторизация' },
    { path: '/clients', label: 'Клиенты' },
    { path: '/clients/new', label: 'Новый клиент' },
    { path: '/messages', label: 'Сообщения' },
    { path: '/invoices', label: 'Счета' },
    { path: '/studios', label: 'Студии' },
    { path: '/nomenclature', label: 'Номенклатура' },
    { path: '/payments', label: 'Платежи' },
    { path: '/timesheets', label: 'Табели' },
    { path: '/schedule-planner', label: 'Планировщик' },
    { path: '/medical-certificates', label: 'Мед. справки' },
    { path: '/settings', label: 'Настройки' },
  ],
  Badge: [
    { path: '/nomenclature', label: 'Номенклатура' },
    { path: '/medical-certificates', label: 'Мед. справки' },
    { path: '/clients/new', label: 'Новый клиент' },
    { path: '/invoices', label: 'Счета' },
    { path: '/studios', label: 'Студии' },
    { path: '/payments', label: 'Платежи' },
  ],
  Avatar: [
    { path: '/profile', label: 'Профиль' },
    { path: '/schedule', label: 'Расписание' },
    { path: '/clients', label: 'Карточка клиента' },
  ],
  Table: [
    { path: '/timesheets', label: 'Табели' },
    { path: '/medical-certificates', label: 'Мед. справки' },
    { path: '/invoices', label: 'Счета' },
    { path: '/clients', label: 'Клиенты' },
    { path: '/payments', label: 'Платежи' },
  ],
  Separator: [
    { path: '/medical-certificates', label: 'Мед. справки' },
    { path: '/invoices', label: 'Счета' },
  ],
  Progress: [],
  ScrollArea: [],

  // Feedback
  Alert: [
    { path: '/login', label: 'Авторизация' },
    { path: '/set-password', label: 'Установка пароля' },
    { path: '/reset-password', label: 'Сброс пароля' },
    { path: '/forgot-password', label: 'Забыли пароль' },
    { path: '/clients/new', label: 'Новый клиент' },
  ],
  Toast: [
    { path: '/', label: 'Все страницы (layout)' },
  ],
  Skeleton: [
    { path: '/clients', label: 'Карточка клиента' },
    { path: '/invoices', label: 'Счета' },
    { path: '/studios', label: 'Студии' },
    { path: '/timesheets', label: 'Табели' },
  ],

  // Overlays
  Dialog: [
    { path: '/clients', label: 'Создание/редактирование клиента' },
    { path: '/nomenclature', label: 'Номенклатура' },
    { path: '/messages', label: 'Сообщения' },
  ],
  Sheet: [
    { path: '/medical-certificates', label: 'Мед. справки' },
  ],
  Popover: [
    { path: '/schedule-planner', label: 'Планировщик' },
    { path: '/medical-certificates/new', label: 'Новая справка' },
    { path: '/timesheets', label: 'Табели' },
  ],
  Tooltip: [],
  DropdownMenu: [
    { path: '/nomenclature', label: 'Номенклатура' },
    { path: '/clients', label: 'Клиенты' },
  ],
  AlertDialog: [
    { path: '/schedule-planner', label: 'Планировщик' },
    { path: '/medical-certificates', label: 'Мед. справки' },
    { path: '/nomenclature', label: 'Номенклатура' },
    { path: '/clients', label: 'Клиенты' },
  ],
  Command: [
    { path: '/schedule', label: 'Расписание' },
  ],
  ContextMenu: [],

  // Navigation
  Tabs: [
    { path: '/schedule-planner', label: 'Планировщик' },
    { path: '/design-system', label: 'Design System' },
    { path: '/nomenclature', label: 'Номенклатура' },
  ],
  Collapsible: [],
  Toggle: [],
  ToggleGroup: [],
};
