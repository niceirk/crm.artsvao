'use client';

import { useState } from 'react';
import { ComponentDemo } from '../component-demo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alert-dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { UsageItem } from '../usage-info';

interface DemoProps {
  usages?: UsageItem[];
}

export function DialogDemo({ usages }: DemoProps) {
  const code = `<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Открыть диалог</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Заголовок диалога</DialogTitle>
      <DialogDescription>
        Описание диалогового окна
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      Содержимое диалога
    </div>
  </DialogContent>
</Dialog>`;

  return (
    <ComponentDemo
      title="Dialog"
      description="Модальное диалоговое окно"
      usages={usages}
      preview={
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Открыть диалог</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Заголовок диалога</DialogTitle>
              <DialogDescription>
                Описание диалогового окна
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              Содержимое диалога
            </div>
          </DialogContent>
        </Dialog>
      }
      code={code}
    />
  );
}

export function SheetDemo({ usages }: DemoProps) {
  const code = `<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Открыть панель</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Заголовок панели</SheetTitle>
      <SheetDescription>
        Описание боковой панели
      </SheetDescription>
    </SheetHeader>
    <div className="py-4">
      Содержимое панели
    </div>
  </SheetContent>
</Sheet>`;

  return (
    <ComponentDemo
      title="Sheet"
      description="Выдвижная боковая панель"
      usages={usages}
      preview={
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Открыть панель</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Заголовок панели</SheetTitle>
              <SheetDescription>
                Описание боковой панели
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              Содержимое панели
            </div>
          </SheetContent>
        </Sheet>
      }
      code={code}
    />
  );
}

export function PopoverDemo({ usages }: DemoProps) {
  const code = `<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Открыть popover</Button>
  </PopoverTrigger>
  <PopoverContent>
    <div className="space-y-2">
      <h4 className="font-medium">Popover заголовок</h4>
      <p className="text-sm text-muted-foreground">
        Содержимое popover
      </p>
    </div>
  </PopoverContent>
</Popover>`;

  return (
    <ComponentDemo
      title="Popover"
      description="Всплывающий контент"
      usages={usages}
      preview={
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Открыть popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="space-y-2">
              <h4 className="font-medium">Popover заголовок</h4>
              <p className="text-sm text-muted-foreground">
                Содержимое popover
              </p>
            </div>
          </PopoverContent>
        </Popover>
      }
      code={code}
    />
  );
}

export function TooltipDemo({ usages }: DemoProps) {
  const code = `<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Наведите курсор</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Подсказка</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>`;

  return (
    <ComponentDemo
      title="Tooltip"
      description="Всплывающая подсказка"
      usages={usages}
      preview={
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Наведите курсор</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Подсказка</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      }
      code={code}
    />
  );
}

export function DropdownMenuDemo({ usages }: DemoProps) {
  const code = `<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Открыть меню</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Профиль</DropdownMenuItem>
    <DropdownMenuItem>Настройки</DropdownMenuItem>
    <DropdownMenuItem>Выйти</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`;

  return (
    <ComponentDemo
      title="Dropdown Menu"
      description="Выпадающее меню"
      usages={usages}
      preview={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Открыть меню</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Профиль</DropdownMenuItem>
            <DropdownMenuItem>Настройки</DropdownMenuItem>
            <DropdownMenuItem>Выйти</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      code={code}
    />
  );
}

export function AlertDialogDemo({ usages }: DemoProps) {
  const code = `<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Удалить</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
      <AlertDialogDescription>
        Это действие нельзя отменить. Данные будут удалены безвозвратно.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Отмена</AlertDialogCancel>
      <AlertDialogAction>Удалить</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`;

  return (
    <ComponentDemo
      title="AlertDialog"
      description="Диалог подтверждения действия"
      usages={usages}
      preview={
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Удалить</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Данные будут удалены безвозвратно.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction>Удалить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
      code={code}
    />
  );
}

export function CommandDemo({ usages }: DemoProps) {
  const code = `<Command className="rounded-lg border shadow-md">
  <CommandInput placeholder="Поиск..." />
  <CommandList>
    <CommandEmpty>Ничего не найдено.</CommandEmpty>
    <CommandGroup heading="Предложения">
      <CommandItem>Календарь</CommandItem>
      <CommandItem>Поиск</CommandItem>
      <CommandItem>Калькулятор</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>`;

  return (
    <ComponentDemo
      title="Command"
      description="Командная палитра с поиском"
      usages={usages}
      preview={
        <Command className="rounded-lg border shadow-md w-[300px]">
          <CommandInput placeholder="Поиск..." />
          <CommandList>
            <CommandEmpty>Ничего не найдено.</CommandEmpty>
            <CommandGroup heading="Предложения">
              <CommandItem>Календарь</CommandItem>
              <CommandItem>Поиск</CommandItem>
              <CommandItem>Калькулятор</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      }
      code={code}
    />
  );
}

export function ContextMenuDemo({ usages }: DemoProps) {
  const code = `<ContextMenu>
  <ContextMenuTrigger className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
    Правый клик здесь
  </ContextMenuTrigger>
  <ContextMenuContent className="w-64">
    <ContextMenuItem>Назад</ContextMenuItem>
    <ContextMenuItem>Вперед</ContextMenuItem>
    <ContextMenuItem>Обновить</ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuSub>
      <ContextMenuSubTrigger>Ещё</ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-48">
        <ContextMenuItem>Сохранить страницу как...</ContextMenuItem>
        <ContextMenuItem>Создать ярлык...</ContextMenuItem>
      </ContextMenuSubContent>
    </ContextMenuSub>
  </ContextMenuContent>
</ContextMenu>`;

  return (
    <ComponentDemo
      title="ContextMenu"
      description="Контекстное меню по правому клику"
      usages={usages}
      preview={
        <ContextMenu>
          <ContextMenuTrigger className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
            Правый клик здесь
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64">
            <ContextMenuItem>Назад</ContextMenuItem>
            <ContextMenuItem>Вперед</ContextMenuItem>
            <ContextMenuItem>Обновить</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>Ещё</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItem>Сохранить страницу как...</ContextMenuItem>
                <ContextMenuItem>Создать ярлык...</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      }
      code={code}
    />
  );
}
