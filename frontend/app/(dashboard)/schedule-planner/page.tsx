'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Copy, Edit, XCircle, Trash2 } from 'lucide-react';
import { RecurringScheduleForm } from './components/recurring-schedule-form';
import { BulkUpdateForm } from './components/bulk-update-form';
import { CopyScheduleForm } from './components/copy-schedule-form';
import { BulkCancelForm } from './components/bulk-cancel-form';
import { BulkDeleteForm } from './components/bulk-delete-form';

export default function SchedulePlannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Планирование расписания</h1>
        <p className="text-muted-foreground">
          Создание повторяющихся занятий и массовое управление расписанием
        </p>
      </div>

      <Tabs defaultValue="recurring" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Повторяющиеся
          </TabsTrigger>
          <TabsTrigger value="bulk-update" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Редактирование
          </TabsTrigger>
          <TabsTrigger value="copy" className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Копирование
          </TabsTrigger>
          <TabsTrigger value="cancel" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Отмена/Перенос
          </TabsTrigger>
          <TabsTrigger value="delete" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Удаление
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recurring">
          <Card>
            <CardHeader>
              <CardTitle>Создание повторяющихся занятий</CardTitle>
            </CardHeader>
            <CardContent>
              <RecurringScheduleForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-update">
          <Card>
            <CardHeader>
              <CardTitle>Массовое редактирование</CardTitle>
            </CardHeader>
            <CardContent>
              <BulkUpdateForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copy">
          <Card>
            <CardHeader>
              <CardTitle>Копирование занятий</CardTitle>
            </CardHeader>
            <CardContent>
              <CopyScheduleForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancel">
          <Card>
            <CardHeader>
              <CardTitle>Отмена и перенос занятий</CardTitle>
            </CardHeader>
            <CardContent>
              <BulkCancelForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delete">
          <Card>
            <CardHeader>
              <CardTitle>Массовое удаление занятий</CardTitle>
            </CardHeader>
            <CardContent>
              <BulkDeleteForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
