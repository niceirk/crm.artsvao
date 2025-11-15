'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from './breadcrumbs';
import { GlobalSearch } from './global-search';
import { UserNav } from './user-nav';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { cn } from '@/lib/utils';

interface TopBarProps {
  sidebarCollapsed: boolean;
}

export function TopBar({ sidebarCollapsed }: TopBarProps) {
  const { setMobileMenuOpen } = useNavigationStore();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 transition-all duration-300 md:px-6',
        'md:pl-4'
      )}
    >
      {/* Кнопка мобильного меню (только на мобильных) */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Открыть меню"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumbs */}
      <div className="hidden md:flex flex-1">
        <Breadcrumbs />
      </div>

      {/* Поиск */}
      <div className="flex flex-1 md:flex-none">
        <GlobalSearch />
      </div>

      {/* Профиль пользователя */}
      <UserNav />
    </header>
  );
}
