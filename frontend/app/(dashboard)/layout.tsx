'use client';

import { Sidebar } from '@/components/navigation/sidebar';
import { MobileSidebar } from '@/components/navigation/mobile-sidebar';
import { TopBar } from '@/components/navigation/topbar';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useNavigationStore();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Проверка авторизации
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
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
    <div className="relative h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar (Drawer) */}
      <MobileSidebar />

      {/* Main Content */}
      <div
        className={cn(
          'flex h-screen flex-col transition-all duration-300',
          'md:pl-16', // На desktop учитываем сайдбар
          sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
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
  );
}
