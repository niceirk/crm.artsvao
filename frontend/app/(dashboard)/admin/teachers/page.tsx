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
import { useTeachers } from '@/hooks/use-teachers';
import { TeachersTable } from './teachers-table';
import { TeacherDialog } from './teacher-dialog';

export default function TeachersPage() {
  const { data: teachers, isLoading } = useTeachers();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Преподаватели</h2>
          <p className="text-muted-foreground">
            Управление преподавателями культурного центра
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить преподавателя
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список преподавателей</CardTitle>
          <CardDescription>
            Всего преподавателей: {teachers?.length || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeachersTable teachers={teachers || []} isLoading={isLoading} />
        </CardContent>
      </Card>

      <TeacherDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
