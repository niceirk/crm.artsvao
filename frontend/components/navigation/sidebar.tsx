'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useAuth } from '@/hooks/use-auth';
import { filterNavigationByRole, navigationConfig, type NavItem } from '@/lib/config/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useNavigationStore();

  const isAdmin = user?.role === 'ADMIN';
  const filteredNavigation = filterNavigationByRole(navigationConfig, isAdmin);

  const isActive = (href: string) => {
    if (href === '/schedule') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64',
          'hidden md:block' // Скрываем на мобильных, там будет drawer
        )}
      >
      {/* Header с логотипом */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!sidebarCollapsed ? (
          <>
            <Link href="/schedule" className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                АВ
              </div>
              <span className="text-lg">артсвао</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8"
              aria-label="Свернуть меню"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex w-full flex-col items-center gap-2">
            <Link
              href="/schedule"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs"
            >
              АВ
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8"
              aria-label="Развернуть меню"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Навигация */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredNavigation.map((group, groupIndex) => (
          <div key={groupIndex} className="pb-4">
            {!sidebarCollapsed && (
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
      </aside>
    </TooltipProvider>
  );
}

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

function NavLink({ item, isActive, collapsed }: NavLinkProps) {
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        collapsed && 'justify-center'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary-foreground')} />
      {!collapsed && (
        <>
          <span className="flex-1">{item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto">
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.title}
          {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}
