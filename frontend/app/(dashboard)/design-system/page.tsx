'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, FormInput, LayoutGrid, Bell, Layers, Navigation, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

// Foundation demos
import { ColorsDemo, TypographyDemo, SpacingDemo, BorderRadiusDemo } from '@/components/design-system/demos/foundation-demos';

// Forms demos
import {
  ButtonDemo,
  InputDemo,
  TextareaDemo,
  CheckboxDemo,
  SelectDemo,
  CalendarDemo,
  DatePickerDemo,
  RadioGroupDemo,
  SwitchDemo,
  FormDemo,
} from '@/components/design-system/demos/forms-demos';

// Data Display demos
import {
  CardDemo,
  BadgeDemo,
  AvatarDemo,
  TableDemo,
  SeparatorDemo,
  ProgressDemo,
  ScrollAreaDemo,
} from '@/components/design-system/demos/data-display-demos';

// Feedback demos
import { AlertDemo, ToastDemo, SkeletonDemo } from '@/components/design-system/demos/feedback-demos';

// Overlay demos
import {
  DialogDemo,
  SheetDemo,
  PopoverDemo,
  TooltipDemo,
  DropdownMenuDemo,
  AlertDialogDemo,
  CommandDemo,
  ContextMenuDemo,
} from '@/components/design-system/demos/overlay-demos';

// Navigation demos
import {
  TabsDemo,
  CollapsibleDemo,
  ToggleDemo,
  ToggleGroupDemo,
} from '@/components/design-system/demos/navigation-demos';

// Usage data
import { componentUsageData } from '@/components/design-system/component-usage-data';

export default function DesignSystemPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Design System</h1>
          <p className="text-muted-foreground">
            Библиотека компонентов и элементов дизайна
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Переключить тему</span>
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="foundation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="foundation" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Foundation</span>
          </TabsTrigger>
          <TabsTrigger value="forms" className="gap-2">
            <FormInput className="h-4 w-4" />
            <span className="hidden sm:inline">Forms</span>
          </TabsTrigger>
          <TabsTrigger value="data-display" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Feedback</span>
          </TabsTrigger>
          <TabsTrigger value="overlays" className="gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Overlays</span>
          </TabsTrigger>
          <TabsTrigger value="navigation" className="gap-2">
            <Navigation className="h-4 w-4" />
            <span className="hidden sm:inline">Navigation</span>
          </TabsTrigger>
        </TabsList>

        {/* Foundation */}
        <TabsContent value="foundation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Foundation
              </CardTitle>
              <CardDescription>
                Основы дизайн-системы: цвета, типография, отступы и скругления
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-6">
            <ColorsDemo />
            <TypographyDemo />
            <SpacingDemo />
            <BorderRadiusDemo />
          </div>
        </TabsContent>

        {/* Forms */}
        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FormInput className="h-5 w-5" />
                Form Components
              </CardTitle>
              <CardDescription>
                Компоненты форм: кнопки, поля ввода, селекты, чекбоксы, календари и формы
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-6">
            <ButtonDemo usages={componentUsageData.Button} />
            <InputDemo usages={componentUsageData.Input} />
            <TextareaDemo usages={componentUsageData.Textarea} />
            <SelectDemo usages={componentUsageData.Select} />
            <CheckboxDemo usages={componentUsageData.Checkbox} />
            <CalendarDemo usages={componentUsageData.Calendar} />
            <DatePickerDemo usages={componentUsageData.DatePicker} />
            <RadioGroupDemo usages={componentUsageData.RadioGroup} />
            <SwitchDemo usages={componentUsageData.Switch} />
            <FormDemo usages={componentUsageData.Form} />
          </div>
        </TabsContent>

        {/* Data Display */}
        <TabsContent value="data-display" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                Data Display
              </CardTitle>
              <CardDescription>
                Компоненты для отображения данных: карточки, таблицы, значки, разделители
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-6">
            <CardDemo usages={componentUsageData.Card} />
            <BadgeDemo usages={componentUsageData.Badge} />
            <TableDemo usages={componentUsageData.Table} />
            <AvatarDemo usages={componentUsageData.Avatar} />
            <SeparatorDemo usages={componentUsageData.Separator} />
            <ProgressDemo usages={componentUsageData.Progress} />
            <ScrollAreaDemo usages={componentUsageData.ScrollArea} />
          </div>
        </TabsContent>

        {/* Feedback */}
        <TabsContent value="feedback" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Feedback
              </CardTitle>
              <CardDescription>
                Компоненты обратной связи: уведомления, алерты, скелетоны
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-6">
            <AlertDemo usages={componentUsageData.Alert} />
            <ToastDemo usages={componentUsageData.Toast} />
            <SkeletonDemo usages={componentUsageData.Skeleton} />
          </div>
        </TabsContent>

        {/* Overlays */}
        <TabsContent value="overlays" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Overlay Components
              </CardTitle>
              <CardDescription>
                Оверлей компоненты: диалоги, модальные окна, всплывающие меню, командная палитра
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-6">
            <DialogDemo usages={componentUsageData.Dialog} />
            <AlertDialogDemo usages={componentUsageData.AlertDialog} />
            <SheetDemo usages={componentUsageData.Sheet} />
            <PopoverDemo usages={componentUsageData.Popover} />
            <TooltipDemo usages={componentUsageData.Tooltip} />
            <DropdownMenuDemo usages={componentUsageData.DropdownMenu} />
            <CommandDemo usages={componentUsageData.Command} />
            <ContextMenuDemo usages={componentUsageData.ContextMenu} />
          </div>
        </TabsContent>

        {/* Navigation */}
        <TabsContent value="navigation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Navigation
              </CardTitle>
              <CardDescription>
                Навигационные компоненты: вкладки, раскрывающиеся блоки, переключатели
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-6">
            <TabsDemo usages={componentUsageData.Tabs} />
            <CollapsibleDemo usages={componentUsageData.Collapsible} />
            <ToggleDemo usages={componentUsageData.Toggle} />
            <ToggleGroupDemo usages={componentUsageData.ToggleGroup} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
