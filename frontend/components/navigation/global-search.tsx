'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Calendar, Users, Building2, GraduationCap } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { navigationConfig } from '@/lib/config/navigation';

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Горячая клавиша: Cmd+K (Mac) или Ctrl+K (Windows/Linux)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          'relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64'
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Поиск...</span>
        <span className="inline-flex lg:hidden">Поиск</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Введите запрос для поиска..." />
        <CommandList>
          <CommandEmpty>Ничего не найдено</CommandEmpty>

          {/* Навигация по страницам */}
          <CommandGroup heading="Страницы">
            {navigationConfig.map((group) =>
              group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    value={item.title}
                    onSelect={() => item.href && handleSelect(item.href)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                    {item.description && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    )}
                  </CommandItem>
                );
              })
            )}
          </CommandGroup>

          {/* Быстрые действия (пока моки, позже можно добавить реальный поиск) */}
          <CommandGroup heading="Быстрые действия">
            <CommandItem onSelect={() => handleSelect('/clients?action=create')}>
              <Users className="mr-2 h-4 w-4" />
              <span>Создать клиента</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/schedule?action=create')}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Добавить занятие</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/admin/rooms?action=create')}>
              <Building2 className="mr-2 h-4 w-4" />
              <span>Добавить помещение</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
