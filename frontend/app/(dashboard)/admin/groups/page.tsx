'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useGroups } from '@/hooks/use-groups';
import { GroupsTable } from './groups-table';
import { GroupDialog } from './group-dialog';

export default function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Группы</h2>
          <p className="text-muted-foreground">
            Управление группами культурного центра
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить группу
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список групп</CardTitle>
          <CardDescription>
            Всего групп: {groups?.length || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GroupsTable groups={groups || []} isLoading={isLoading} />
        </CardContent>
      </Card>

      <GroupDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
