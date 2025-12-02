'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Laptop, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkspacesTable } from './components/workspaces-table';
import { CreateWorkspaceDialog } from './components/create-workspace-dialog';
import { useWorkspaces } from '@/hooks/use-workspaces';

export default function WorkspacesPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data: workspaces, isLoading } = useWorkspaces();

  const stats = {
    total: workspaces?.length || 0,
    available: workspaces?.filter(w => w.status === 'AVAILABLE').length || 0,
    occupied: workspaces?.filter(w => w.status === 'OCCUPIED').length || 0,
    maintenance: workspaces?.filter(w => w.status === 'MAINTENANCE').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/rentals">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Laptop className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Рабочие места</h1>
            <p className="text-muted-foreground">Управление рабочими местами в коворкинге</p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить место
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего мест</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Свободно</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Занято</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.occupied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">На обслуживании</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.maintenance}</div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица */}
      <WorkspacesTable workspaces={workspaces || []} isLoading={isLoading} />

      {/* Диалог создания */}
      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
