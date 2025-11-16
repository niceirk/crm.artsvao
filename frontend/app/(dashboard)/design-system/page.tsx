'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, FormInput, LayoutGrid, Bell, Layers, Navigation, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

// Foundation demos
import { ColorsDemo, TypographyDemo, SpacingDemo, BorderRadiusDemo } from '@/components/design-system/demos/foundation-demos';

// Forms demos
import { ButtonDemo, InputDemo, TextareaDemo, CheckboxDemo, SelectDemo } from '@/components/design-system/demos/forms-demos';

// Data Display demos
import { CardDemo, BadgeDemo, AvatarDemo, TableDemo } from '@/components/design-system/demos/data-display-demos';

// Feedback demos
import { AlertDemo, ToastDemo, SkeletonDemo } from '@/components/design-system/demos/feedback-demos';

// Overlay demos
import { DialogDemo, SheetDemo, PopoverDemo, TooltipDemo, DropdownMenuDemo } from '@/components/design-system/demos/overlay-demos';

// Navigation demos
import { TabsDemo, CollapsibleDemo } from '@/components/design-system/demos/navigation-demos';

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
                Компоненты форм: кнопки, поля ввода, селекты и чекбоксы
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-6">
            <ButtonDemo />
            <InputDemo />
            <TextareaDemo />
            <SelectDemo />
            <CheckboxDemo />
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
                Компоненты для отображения данных: карточки, таблицы, значки
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-6">
            <CardDemo />
            <BadgeDemo />
            <TableDemo />
            <AvatarDemo />
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
            <AlertDemo />
            <ToastDemo />
            <SkeletonDemo />
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
                Оверлей компоненты: диалоги, модальные окна, всплывающие меню
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-6">
            <DialogDemo />
            <SheetDemo />
            <PopoverDemo />
            <TooltipDemo />
            <DropdownMenuDemo />
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
                Навигационные компоненты: вкладки, раскрывающиеся блоки
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-6">
            <TabsDemo />
            <CollapsibleDemo />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
