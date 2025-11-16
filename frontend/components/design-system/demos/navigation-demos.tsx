'use client';

import { ComponentDemo } from '../component-demo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

export function TabsDemo() {
  const code = `<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Вкладка 1</TabsTrigger>
    <TabsTrigger value="tab2">Вкладка 2</TabsTrigger>
    <TabsTrigger value="tab3">Вкладка 3</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    Содержимое первой вкладки
  </TabsContent>
  <TabsContent value="tab2">
    Содержимое второй вкладки
  </TabsContent>
  <TabsContent value="tab3">
    Содержимое третьей вкладки
  </TabsContent>
</Tabs>`;

  return (
    <ComponentDemo
      title="Tabs"
      description="Вкладки для переключения контента"
      preview={
        <Tabs defaultValue="tab1" className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tab1">Вкладка 1</TabsTrigger>
            <TabsTrigger value="tab2">Вкладка 2</TabsTrigger>
            <TabsTrigger value="tab3">Вкладка 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="mt-4 p-4 border rounded-lg">
            Содержимое первой вкладки
          </TabsContent>
          <TabsContent value="tab2" className="mt-4 p-4 border rounded-lg">
            Содержимое второй вкладки
          </TabsContent>
          <TabsContent value="tab3" className="mt-4 p-4 border rounded-lg">
            Содержимое третьей вкладки
          </TabsContent>
        </Tabs>
      }
      code={code}
    />
  );
}

export function CollapsibleDemo() {
  const code = `<Collapsible>
  <CollapsibleTrigger asChild>
    <Button variant="ghost">
      Развернуть
      <ChevronDown className="ml-2 h-4 w-4" />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="mt-2">
    Скрытое содержимое, которое можно развернуть
  </CollapsibleContent>
</Collapsible>`;

  return (
    <ComponentDemo
      title="Collapsible"
      description="Раскрывающийся блок контента"
      preview={
        <Collapsible className="w-full max-w-md">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              Развернуть
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-4 border rounded-lg">
            <p className="text-sm">
              Скрытое содержимое, которое можно развернуть и свернуть.
              Используется для экономии места на странице.
            </p>
          </CollapsibleContent>
        </Collapsible>
      }
      code={code}
    />
  );
}
