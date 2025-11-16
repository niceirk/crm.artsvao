'use client';

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

export function DialogDemo() {
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

export function SheetDemo() {
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

export function PopoverDemo() {
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

export function TooltipDemo() {
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

export function DropdownMenuDemo() {
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
