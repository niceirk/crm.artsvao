'use client';

import { ReactNode, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodePreview } from './code-preview';
import { UsageInfo, UsageItem } from './usage-info';

export interface ComponentDemoProps {
  title: string;
  description?: string;
  preview: ReactNode;
  code: string;
  controls?: ReactNode;
  className?: string;
  usages?: UsageItem[];
}

export function ComponentDemo({
  title,
  description,
  preview,
  code,
  controls,
  className = '',
  usages,
}: ComponentDemoProps) {
  const [activeTab, setActiveTab] = useState('preview');

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {usages && <UsageInfo usages={usages} />}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Превью</TabsTrigger>
            <TabsTrigger value="code">Код</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4">
            {controls && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="text-sm font-medium mb-3">Настройки</h4>
                {controls}
              </div>
            )}
            <div className="rounded-lg border p-8 bg-background flex items-center justify-center min-h-[200px]">
              {preview}
            </div>
          </TabsContent>

          <TabsContent value="code" className="mt-4">
            <CodePreview code={code} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
