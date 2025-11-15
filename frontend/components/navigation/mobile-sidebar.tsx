'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useAuth } from '@/hooks/use-auth';
import { filterNavigationByRole, navigationConfig, type NavItem } from '@/lib/config/navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

export function MobileSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { mobileMenuOpen, setMobileMenuOpen } = useNavigationStore();

  const isAdmin = user?.role === 'ADMIN';
  const filteredNavigation = filterNavigationByRole(navigationConfig, isAdmin);

  const isActive = (href: string) => {
    if (href === '/schedule') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetContent side="left" className="w-64 p-0">
        {/* Header с логотипом */}
        <div className="flex h-16 items-center border-b px-4">
          <Link
            href="/schedule"
            className="flex items-center gap-2 font-semibold"
            onClick={handleLinkClick}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              АВ
            </div>
            <span className="text-lg">артсвао</span>
          </Link>
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
                    key={item.href}
                    item={item}
                    isActive={isActive(item.href)}
                    onClick={handleLinkClick}
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
}

function MobileNavLink({ item, isActive, onClick }: MobileNavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
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
      {item.badge && (
        <Badge variant="secondary" className="ml-auto">
          {item.badge}
        </Badge>
      )}
    </Link>
  );
}
