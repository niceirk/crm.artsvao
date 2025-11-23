'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useAuth } from '@/hooks/use-auth';
import { filterNavigationByRole, navigationConfig, type NavItem } from '@/lib/config/navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useMessagesStore } from '@/lib/stores/messages-store';

export function MobileSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { mobileMenuOpen, setMobileMenuOpen } = useNavigationStore();
  const unreadCount = useMessagesStore((state) => state.unreadCount);

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

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetContent side="left" className="w-64 p-0">
        {/* Header с логотипом */}
        <div className="flex h-16 items-center border-b px-4">
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              АВ
            </div>
            <span className="text-lg">артсвао</span>
          </div>
        </div>

        {/* Навигация */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {filteredNavigation.map((group, groupIndex) => (
            <div key={groupIndex} className="pb-4">
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <MobileNavLink
                    key={item.href || item.title}
                    item={item}
                    isActive={isParentActive(item)}
                    onClick={handleLinkClick}
                    pathname={pathname}
                    unreadCount={unreadCount}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

interface MobileNavLinkProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  pathname: string;
  unreadCount: number;
}

function MobileNavLink({ item, isActive, onClick, pathname, unreadCount }: MobileNavLinkProps) {
  const Icon = item.icon;
  const { expandedMenus, toggleMenu } = useNavigationStore();
  const isExpanded = expandedMenus.has(item.title);
  const isMessages = item.href === '/messages';
  const dynamicBadge =
    isMessages && unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount.toString()) : null;

  // Если есть children - рендерим Collapsible
  if (item.children) {
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
                onClick={onClick}
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
  return (
    <Link
      href={item.href!}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
      onClick={onClick}
    >
      <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary-foreground')} />
      <span className="flex-1">{item.title}</span>
      {(dynamicBadge || item.badge) && (
        <Badge variant="secondary" className="ml-auto">
          {dynamicBadge || item.badge}
        </Badge>
      )}
    </Link>
  );
}
