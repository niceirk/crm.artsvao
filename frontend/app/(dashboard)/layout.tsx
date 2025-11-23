'use client';

import { Sidebar } from '@/components/navigation/sidebar';
import { MobileSidebar } from '@/components/navigation/mobile-sidebar';
import { TopBar } from '@/components/navigation/topbar';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BreadcrumbsProvider } from '@/lib/contexts/breadcrumbs-context';
import { useMessagesNotifications } from '@/hooks/use-messages-notifications';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useNavigationStore();
  const { user, isLoading } = useAuth();
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const router = useRouter();
  useMessagesNotifications();

  // Проверка авторизации
  useEffect(() => {
    if (_hasHydrated && !isLoading && !user) {
      router.push('/login');
    }
  }, [_hasHydrated, user, isLoading, router]);

  // Wait for hydration to complete
  if (!_hasHydrated || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <BreadcrumbsProvider>
      <div className="relative h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Sidebar (Drawer) */}
        <MobileSidebar />

        {/* Main Content */}
        <div
          className={cn(
            'flex h-screen flex-col transition-all duration-300',
            'md:pl-20', // На desktop учитываем сайдбар
            sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
          )}
        >
          {/* Top Bar */}
          <TopBar sidebarCollapsed={sidebarCollapsed} />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-muted/40 p-4 md:p-6">
            <div className="mx-auto max-w-screen-2xl">{children}</div>
          </main>
        </div>
      </div>
    </BreadcrumbsProvider>
  );
}
