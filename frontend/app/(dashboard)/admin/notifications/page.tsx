'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplatesTab } from './components/templates-tab';
import { HistoryTab } from './components/history-tab';
import { MassSendTab } from './components/mass-send-tab';
import { QueueStatsCard } from './components/queue-stats-card';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('templates');

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Уведомления</h2>
          <p className="text-muted-foreground">
            Управление шаблонами, рассылками и историей уведомлений
          </p>
        </div>
      </div>

      <QueueStatsCard />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Шаблоны</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
          <TabsTrigger value="mass-send">Массовая рассылка</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <TemplatesTab />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <HistoryTab />
        </TabsContent>

        <TabsContent value="mass-send" className="space-y-4">
          <MassSendTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
