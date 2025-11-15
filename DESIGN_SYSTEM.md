# Дизайн-система проекта

**Дата создания:** 2025-11-14
**Версия:** 1.0.0
**Статус:** MVP

---

## Оглавление

1. [Введение](#введение)
2. [Технологический стек](#технологический-стек)
3. [Цветовая палитра](#цветовая-палитра)
4. [Типографика](#типографика)
5. [Компоненты UI](#компоненты-ui)
6. [Spacing & Layout](#spacing--layout)
7. [Примеры использования](#примеры-использования)

---

## Введение

Данный документ описывает дизайн-систему проекта **Система управления культурным центром**. Дизайн-система базируется на **shadcn/ui** с использованием стиля **New York** и цветовой палитры **Neutral**.

### Цели дизайн-системы

- **Консистентность**: Единообразный внешний вид всех интерфейсов
- **Переиспользуемость**: Набор готовых компонентов для быстрой разработки
- **Масштабируемость**: Возможность расширения для новых функций
- **Доступность**: Соответствие стандартам accessibility (WCAG 2.1)

---

## Технологический стек

### Frontend

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript 5**
- **Tailwind CSS 3.4**
- **shadcn/ui** (New York style, Neutral theme)

### UI Библиотеки

- **Radix UI** - Базовые компоненты с поддержкой accessibility
- **Lucide React** - Набор иконок
- **class-variance-authority** - Управление вариантами компонентов
- **tailwind-merge** - Объединение Tailwind классов

### Конфигурация

```json
{
  "style": "new-york",
  "baseColor": "neutral",
  "cssVariables": true,
  "darkMode": true
}
```

---

## Цветовая палитра

### Базовые цвета (Light Mode)

Цветовая схема основана на **нейтральных оттенках** (Neutral) для создания чистого и профессионального интерфейса.

#### Primary Colors

- **Background**: `hsl(0, 0%, 100%)` - Белый фон
- **Foreground**: `hsl(0, 0%, 3.9%)` - Почти черный текст
- **Primary**: `hsl(0, 0%, 9%)` - Темный для основных действий
- **Primary Foreground**: `hsl(0, 0%, 98%)` - Светлый текст на primary

#### Secondary Colors

- **Secondary**: `hsl(0, 0%, 96.1%)` - Светло-серый для вторичных элементов
- **Secondary Foreground**: `hsl(0, 0%, 9%)` - Темный текст на secondary

#### Accent Colors

- **Accent**: `hsl(0, 0%, 96.1%)` - Акцентный фон
- **Accent Foreground**: `hsl(0, 0%, 9%)` - Текст на акценте

#### Semantic Colors

- **Muted**: `hsl(0, 0%, 96.1%)` - Приглушенный фон
- **Muted Foreground**: `hsl(0, 0%, 45.1%)` - Серый текст для второстепенной информации

- **Destructive**: `hsl(0, 84.2%, 60.2%)` - Красный для удаления/ошибок
- **Destructive Foreground**: `hsl(0, 0%, 98%)` - Светлый текст на destructive

#### UI Elements

- **Border**: `hsl(0, 0%, 89.8%)` - Светло-серые границы
- **Input**: `hsl(0, 0%, 89.8%)` - Фон полей ввода
- **Ring**: `hsl(0, 0%, 3.9%)` - Обводка при фокусе

- **Card**: `hsl(0, 0%, 100%)` - Белый фон карточек
- **Card Foreground**: `hsl(0, 0%, 3.9%)` - Текст в карточках

- **Popover**: `hsl(0, 0%, 100%)` - Фон всплывающих окон
- **Popover Foreground**: `hsl(0, 0%, 3.9%)` - Текст в поповерах

### Темная тема (Dark Mode)

#### Primary Colors (Dark)

- **Background**: `hsl(0, 0%, 3.9%)` - Темный фон
- **Foreground**: `hsl(0, 0%, 98%)` - Светлый текст
- **Primary**: `hsl(0, 0%, 98%)` - Светлый для основных действий
- **Primary Foreground**: `hsl(0, 0%, 9%)` - Темный текст на primary

#### Secondary Colors (Dark)

- **Secondary**: `hsl(0, 0%, 14.9%)` - Темно-серый для вторичных элементов
- **Muted**: `hsl(0, 0%, 14.9%)` - Приглушенный фон
- **Border**: `hsl(0, 0%, 14.9%)` - Темные границы

### Применение цветов

```tsx
// Использование в компонентах
<Button className="bg-primary text-primary-foreground">
  Сохранить
</Button>

<Alert variant="destructive">
  Ошибка при сохранении данных
</Alert>

<div className="bg-muted text-muted-foreground">
  Второстепенная информация
</div>
```

---

## Типографика

### Шрифты

Проект использует системные шрифты для обеспечения производительности и нативного вида:

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
             'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans',
             'Droid Sans', 'Helvetica Neue', sans-serif;
```

### Размеры заголовков

| Элемент | Класс Tailwind | Размер | Line Height | Использование |
|---------|----------------|--------|-------------|---------------|
| H1 | `text-4xl font-extrabold` | 36px | 40px | Главные заголовки страниц |
| H2 | `text-3xl font-bold` | 30px | 36px | Заголовки секций |
| H3 | `text-2xl font-semibold` | 24px | 32px | Заголовки подсекций |
| H4 | `text-xl font-semibold` | 20px | 28px | Заголовки карточек |
| H5 | `text-lg font-medium` | 18px | 28px | Подзаголовки |
| H6 | `text-base font-medium` | 16px | 24px | Мелкие заголовки |

### Размеры текста

| Назначение | Класс Tailwind | Размер | Line Height |
|------------|----------------|--------|-------------|
| Large | `text-lg` | 18px | 28px |
| Base (по умолчанию) | `text-base` | 16px | 24px |
| Small | `text-sm` | 14px | 20px |
| Extra Small | `text-xs` | 12px | 16px |

### Плотность шрифта (Font Weight)

| Название | Класс | Вес | Использование |
|----------|-------|-----|---------------|
| Light | `font-light` | 300 | Второстепенный текст |
| Normal | `font-normal` | 400 | Основной текст |
| Medium | `font-medium` | 500 | Подзаголовки |
| Semibold | `font-semibold` | 600 | Заголовки |
| Bold | `font-bold` | 700 | Акценты |
| Extrabold | `font-extrabold` | 800 | Главные заголовки |

### Примеры

```tsx
// Заголовок страницы
<h1 className="text-4xl font-extrabold tracking-tight">
  Управление клиентами
</h1>

// Подзаголовок
<h2 className="text-2xl font-semibold text-foreground">
  Список абонементов
</h2>

// Основной текст
<p className="text-base text-muted-foreground">
  Всего клиентов: 245
</p>

// Мелкий текст
<span className="text-sm text-muted-foreground">
  Последнее обновление: 14.11.2024
</span>
```

---

## Компоненты UI

### Установленные компоненты

Все компоненты находятся в директории `frontend/components/ui/`

#### 1. Формы

##### Button (Кнопка)

**Файл**: `components/ui/button.tsx`

**Варианты**:
- `default` - Основная кнопка (primary)
- `destructive` - Удаление/опасное действие
- `outline` - Обводка без заливки
- `secondary` - Вторичная кнопка
- `ghost` - Прозрачная кнопка
- `link` - Кнопка-ссылка

**Размеры**:
- `default` - Стандартный (h-10, px-4)
- `sm` - Маленький (h-9, px-3)
- `lg` - Большой (h-11, px-8)
- `icon` - Только иконка (h-10, w-10)

**Пример**:
```tsx
import { Button } from "@/components/ui/button"

<Button>Сохранить</Button>
<Button variant="destructive">Удалить</Button>
<Button variant="outline" size="sm">Отмена</Button>
```

##### Input (Поле ввода)

**Файл**: `components/ui/input.tsx`

**Пример**:
```tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

<div className="grid w-full max-w-sm items-center gap-1.5">
  <Label htmlFor="email">Email</Label>
  <Input
    type="email"
    id="email"
    placeholder="example@mail.ru"
  />
</div>
```

##### Textarea (Многострочное поле)

**Файл**: `components/ui/textarea.tsx`

**Пример**:
```tsx
import { Textarea } from "@/components/ui/textarea"

<Textarea
  placeholder="Введите комментарий..."
  className="resize-none"
  rows={4}
/>
```

##### Select (Выпадающий список)

**Файл**: `components/ui/select.tsx`

**Пример**:
```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Выберите студию" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="dance">Танцы</SelectItem>
    <SelectItem value="yoga">Йога</SelectItem>
    <SelectItem value="music">Музыка</SelectItem>
  </SelectContent>
</Select>
```

##### Checkbox (Чекбокс)

**Файл**: `components/ui/checkbox.tsx`

**Пример**:
```tsx
import { Checkbox } from "@/components/ui/checkbox"

<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <label htmlFor="terms">Согласен с условиями</label>
</div>
```

#### 2. Данные и таблицы

##### Table (Таблица)

**Файл**: `components/ui/table.tsx`

**Компоненты**:
- `Table` - Контейнер таблицы
- `TableHeader` - Шапка
- `TableBody` - Тело
- `TableFooter` - Футер
- `TableRow` - Строка
- `TableHead` - Ячейка заголовка
- `TableCell` - Ячейка данных

**Пример**:
```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Имя</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Статус</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Иван Иванов</TableCell>
      <TableCell>ivan@mail.ru</TableCell>
      <TableCell>Активен</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### 3. Навигация

##### Tabs (Вкладки)

**Файл**: `components/ui/tabs.tsx`

**Пример**:
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="clients" className="w-full">
  <TabsList>
    <TabsTrigger value="clients">Клиенты</TabsTrigger>
    <TabsTrigger value="studios">Студии</TabsTrigger>
    <TabsTrigger value="schedule">Расписание</TabsTrigger>
  </TabsList>
  <TabsContent value="clients">
    Контент вкладки "Клиенты"
  </TabsContent>
  <TabsContent value="studios">
    Контент вкладки "Студии"
  </TabsContent>
</Tabs>
```

##### Dropdown Menu (Выпадающее меню)

**Файл**: `components/ui/dropdown-menu.tsx`

**Пример**:
```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Действия</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Редактировать</DropdownMenuItem>
    <DropdownMenuItem>Дублировать</DropdownMenuItem>
    <DropdownMenuItem className="text-destructive">
      Удалить
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### 4. Модальные окна

##### Dialog (Диалоговое окно)

**Файл**: `components/ui/dialog.tsx`

**Пример**:
```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Добавить клиента</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Новый клиент</DialogTitle>
      <DialogDescription>
        Заполните данные нового клиента
      </DialogDescription>
    </DialogHeader>
    {/* Форма добавления клиента */}
  </DialogContent>
</Dialog>
```

##### Alert Dialog (Диалог подтверждения)

**Файл**: `components/ui/alert-dialog.tsx`

**Пример**:
```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Удалить</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
      <AlertDialogDescription>
        Это действие нельзя отменить. Клиент будет удален из системы.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Отмена</AlertDialogCancel>
      <AlertDialogAction>Удалить</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

##### Sheet (Боковая панель)

**Файл**: `components/ui/sheet.tsx`

**Стороны**: `top`, `right`, `bottom`, `left`

**Пример**:
```tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Фильтры</Button>
  </SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Фильтры</SheetTitle>
      <SheetDescription>
        Настройте параметры фильтрации
      </SheetDescription>
    </SheetHeader>
    {/* Содержимое панели фильтров */}
  </SheetContent>
</Sheet>
```

#### 5. Уведомления

##### Toast (Всплывающее уведомление)

**Файлы**:
- `components/ui/toast.tsx`
- `components/ui/toaster.tsx`
- `hooks/use-toast.ts`

**Варианты**:
- `default` - Обычное уведомление
- `destructive` - Ошибка

**Пример**:
```tsx
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

// В компоненте
const { toast } = useToast()

// Успешное уведомление
toast({
  title: "Клиент добавлен",
  description: "Новый клиент успешно добавлен в систему",
})

// Ошибка
toast({
  variant: "destructive",
  title: "Ошибка",
  description: "Не удалось сохранить данные",
})

// Добавить Toaster в layout
<Toaster />
```

##### Alert (Блок уведомления)

**Файл**: `components/ui/alert.tsx`

**Варианты**:
- `default` - Обычное
- `destructive` - Ошибка/предупреждение

**Пример**:
```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Внимание</AlertTitle>
  <AlertDescription>
    У вас есть неподтвержденные записи на сегодня
  </AlertDescription>
</Alert>
```

#### 6. Отображение данных

##### Card (Карточка)

**Файл**: `components/ui/card.tsx`

**Компоненты**:
- `Card` - Контейнер
- `CardHeader` - Шапка
- `CardTitle` - Заголовок
- `CardDescription` - Описание
- `CardContent` - Контент
- `CardFooter` - Футер

**Пример**:
```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Статистика за месяц</CardTitle>
    <CardDescription>Ноябрь 2024</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Новых клиентов: 25</p>
    <p>Занятий проведено: 180</p>
  </CardContent>
  <CardFooter>
    <Button variant="outline">Подробнее</Button>
  </CardFooter>
</Card>
```

##### Badge (Бейдж)

**Файл**: `components/ui/badge.tsx`

**Варианты**:
- `default` - Обычный
- `secondary` - Вторичный
- `destructive` - Деструктивный
- `outline` - С обводкой

**Пример**:
```tsx
import { Badge } from "@/components/ui/badge"

<Badge>Активен</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Отменен</Badge>
<Badge variant="outline">Архив</Badge>
```

#### 7. Дата и время

##### Calendar (Календарь)

**Файл**: `components/ui/calendar.tsx`

**Зависимость**: `react-day-picker`

**Пример**:
```tsx
import { Calendar } from "@/components/ui/calendar"
import { useState } from "react"

const [date, setDate] = useState<Date | undefined>(new Date())

<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  className="rounded-md border"
/>
```

### Список всех установленных компонентов

| Компонент | Файл | Назначение |
|-----------|------|------------|
| Button | `button.tsx` | Кнопки с различными вариантами |
| Input | `input.tsx` | Текстовые поля ввода |
| Textarea | `textarea.tsx` | Многострочные поля ввода |
| Select | `select.tsx` | Выпадающие списки |
| Checkbox | `checkbox.tsx` | Чекбоксы |
| Label | `label.tsx` | Метки для форм |
| Table | `table.tsx` | Таблицы данных |
| Tabs | `tabs.tsx` | Вкладки |
| Dropdown Menu | `dropdown-menu.tsx` | Выпадающие меню |
| Dialog | `dialog.tsx` | Модальные окна |
| Sheet | `sheet.tsx` | Боковые панели |
| Alert Dialog | `alert-dialog.tsx` | Диалоги подтверждения |
| Toast | `toast.tsx`, `toaster.tsx` | Всплывающие уведомления |
| Alert | `alert.tsx` | Блоки уведомлений |
| Calendar | `calendar.tsx` | Календарь для выбора даты |
| Card | `card.tsx` | Карточки контента |
| Badge | `badge.tsx` | Бейджи/метки |

---

## Spacing & Layout

### Система отступов (Spacing Scale)

Tailwind CSS использует систему отступов, основанную на rem (1 unit = 0.25rem = 4px):

| Класс | Значение | Пиксели | Использование |
|-------|----------|---------|---------------|
| `0` | 0 | 0px | Нет отступа |
| `1` | 0.25rem | 4px | Очень малый |
| `2` | 0.5rem | 8px | Малый |
| `3` | 0.75rem | 12px | |
| `4` | 1rem | 16px | Базовый |
| `5` | 1.25rem | 20px | |
| `6` | 1.5rem | 24px | Средний |
| `8` | 2rem | 32px | Большой |
| `10` | 2.5rem | 40px | |
| `12` | 3rem | 48px | Очень большой |
| `16` | 4rem | 64px | |
| `20` | 5rem | 80px | |
| `24` | 6rem | 96px | |

### Breakpoints (Адаптивность)

| Breakpoint | Минимальная ширина | Устройство |
|------------|-------------------|------------|
| `sm` | 640px | Мобильные (большие) |
| `md` | 768px | Планшеты |
| `lg` | 1024px | Ноутбуки |
| `xl` | 1280px | Десктопы |
| `2xl` | 1400px | Большие экраны |

**Пример использования**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* 1 колонка на мобильных, 2 на планшетах, 3 на десктопах */}
</div>
```

### Grid система

```tsx
// 12-колоночная сетка
<div className="grid grid-cols-12 gap-4">
  <div className="col-span-12 md:col-span-8">Основной контент</div>
  <div className="col-span-12 md:col-span-4">Сайдбар</div>
</div>

// Auto-fit колонки
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</div>
```

### Container

Настроен в `tailwind.config.ts`:

```typescript
container: {
  center: true,
  padding: "2rem",
  screens: {
    "2xl": "1400px",
  },
}
```

**Использование**:
```tsx
<div className="container">
  {/* Контент с автоматическими отступами и центрированием */}
</div>
```

### Border Radius (Скругление углов)

Настроено в `tailwind.config.ts` через CSS-переменные:

| Класс | Значение | Использование |
|-------|----------|---------------|
| `rounded-sm` | `calc(var(--radius) - 4px)` | Маленькое скругление |
| `rounded-md` | `calc(var(--radius) - 2px)` | Среднее скругление |
| `rounded-lg` | `var(--radius)` | Большое скругление (по умолчанию 0.5rem) |
| `rounded-full` | `9999px` | Полное скругление (круг/капсула) |

### Тени (Shadows)

Tailwind предоставляет систему теней:

| Класс | Использование |
|-------|---------------|
| `shadow-sm` | Легкая тень |
| `shadow` | Стандартная тень |
| `shadow-md` | Средняя тень |
| `shadow-lg` | Большая тень |
| `shadow-xl` | Очень большая тень |
| `shadow-2xl` | Максимальная тень |

---

## Примеры использования

### Форма добавления клиента

```tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function AddClientForm() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Добавить нового клиента</CardTitle>
        <CardDescription>
          Заполните данные для регистрации клиента в системе
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Имя</Label>
            <Input id="firstName" placeholder="Иван" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Фамилия</Label>
            <Input id="lastName" placeholder="Иванов" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="ivan@mail.ru" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Телефон</Label>
          <Input id="phone" type="tel" placeholder="+7 (999) 123-45-67" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Тип клиента</Label>
          <Select>
            <SelectTrigger id="type">
              <SelectValue placeholder="Выберите тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Физическое лицо</SelectItem>
              <SelectItem value="company">Компания</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline">Отмена</Button>
        <Button>Сохранить</Button>
      </CardFooter>
    </Card>
  )
}
```

### Таблица со списком студий

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

const studios = [
  { id: 1, name: "Танцевальная студия", teacher: "Анна Петрова", students: 15, status: "active" },
  { id: 2, name: "Студия йоги", teacher: "Мария Сидорова", students: 12, status: "active" },
  { id: 3, name: "Музыкальная студия", teacher: "Петр Иванов", students: 8, status: "inactive" },
]

export function StudiosTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Название</TableHead>
          <TableHead>Преподаватель</TableHead>
          <TableHead>Учеников</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {studios.map((studio) => (
          <TableRow key={studio.id}>
            <TableCell className="font-medium">{studio.name}</TableCell>
            <TableCell>{studio.teacher}</TableCell>
            <TableCell>{studio.students}</TableCell>
            <TableCell>
              <Badge variant={studio.status === "active" ? "default" : "secondary"}>
                {studio.status === "active" ? "Активна" : "Неактивна"}
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Редактировать</DropdownMenuItem>
                  <DropdownMenuItem>Просмотр расписания</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Панель с уведомлениями

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

export function NotificationsPanel() {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Информация</AlertTitle>
        <AlertDescription>
          Сегодня запланировано 5 занятий
        </AlertDescription>
      </Alert>

      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Успешно</AlertTitle>
        <AlertDescription>
          Все платежи за ноябрь обработаны
        </AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Требуется внимание</AlertTitle>
        <AlertDescription>
          У 3 клиентов заканчивается срок действия абонемента
        </AlertDescription>
      </Alert>
    </div>
  )
}
```

---

## Дополнительные ресурсы

### Документация

- **shadcn/ui**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Radix UI**: https://www.radix-ui.com/
- **Lucide Icons**: https://lucide.dev/

### Утилиты

#### cn() - Объединение классов

**Файл**: `lib/utils.ts`

Функция для объединения Tailwind классов с правильным приоритетом:

```typescript
import { cn } from "@/lib/utils"

// Пример использования
<Button className={cn("w-full", error && "border-destructive")}>
  Отправить
</Button>
```

### MCP Сервер shadcn

MCP сервер установлен и настроен для интеграции с Claude Code. Это позволяет получать актуальную документацию по компонентам shadcn/ui прямо в процессе разработки.

**Конфигурация**: `.mcp.json` (в корне проекта)

---

## Обновление дизайн-системы

Данный документ будет обновляться по мере добавления новых компонентов и стилей в проект.

### История изменений

| Дата | Версия | Изменения |
|------|--------|-----------|
| 2025-11-14 | 1.0.0 | Первая версия (MVP): базовые компоненты, цвета, типографика |

---

**Контакты для вопросов**: [GitHub Issues](https://github.com/your-repo/issues)
