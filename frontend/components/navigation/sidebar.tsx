'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useAuth } from '@/hooks/use-auth';
import { filterNavigationByRole, navigationConfig, type NavItem } from '@/lib/config/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useNavigationStore();

  const isAdmin = user?.role === 'ADMIN';
  const filteredNavigation = filterNavigationByRole(navigationConfig, isAdmin);

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/schedule') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const isParentActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => isActive(child.href));
    }
    return isActive(item.href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300 flex flex-col',
          sidebarCollapsed ? 'w-20' : 'w-64',
          'hidden md:block' // Скрываем на мобильных, там будет drawer
        )}
      >
      {/* Header с логотипом */}
      <div className="flex h-16 items-center justify-between border-b px-4 flex-shrink-0">
        {!sidebarCollapsed ? (
          <>
            <div className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                АВ
              </div>
              <span className="text-lg">артсвао</span>
            </div>
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
          <div className="flex w-full items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs">
              АВ
            </div>
          </div>
        )}
      </div>

      {/* Навигация */}
      <div 
        className="overflow-y-auto p-4 scrollbar-hide" 
        style={{ height: sidebarCollapsed ? 'calc(100vh - 144px)' : 'calc(100vh - 64px)' }}
      >
        <div className="space-y-1">
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
                    key={item.href || item.title}
                    item={item}
                    isActive={isParentActive(item)}
                    collapsed={sidebarCollapsed}
                    pathname={pathname}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer с кнопкой разворачивания в свернутом режиме */}
      {sidebarCollapsed && (
        <div className="border-t p-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-10 w-10 mx-auto"
            aria-label="Развернуть меню"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}
      </aside>
    </TooltipProvider>
  );
}

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  pathname: string;
}

function NavLink({ item, isActive, collapsed, pathname }: NavLinkProps) {
  const Icon = item.icon;
  const { expandedMenus, toggleMenu } = useNavigationStore();
  const isExpanded = expandedMenus.has(item.title);

  // Если есть children - рендерим Collapsible
  if (item.children) {
    if (collapsed) {
      // В collapsed режиме показываем dropdown через Tooltip
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'group flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary-foreground')} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-1 p-2">
            <div className="font-semibold mb-1">{item.title}</div>
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'rounded px-2 py-1 text-sm transition-colors',
                  pathname === child.href || pathname.startsWith(child.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                )}
              >
                {child.title}
              </Link>
            ))}
          </TooltipContent>
        </Tooltip>
      );
    }

    // Развернутый режим - Collapsible меню
    return (
      <Collapsible open={isExpanded} onOpenChange={() => toggleMenu(item.title)}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary-foreground')} />
            <span className="flex-1 text-left">{item.title}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200',
                isExpanded && 'rotate-180',
                isActive && 'text-primary-foreground'
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 space-y-1">
          {item.children.map((child) => {
            const isChildActive = pathname === child.href || pathname.startsWith(child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg py-2 pl-11 pr-3 text-sm transition-colors',
                  isChildActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <span className="flex-1">{child.title}</span>
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Обычная ссылка без children
  const linkContent = (
    <Link
      href={item.href!}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        collapsed && 'justify-center'
      )}
    >
      <Icon className={cn(
        collapsed ? 'h-5 w-5' : 'h-4 w-4',
        'shrink-0',
        isActive && 'text-primary-foreground'
      )} />
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
