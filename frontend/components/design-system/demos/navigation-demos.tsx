'use client';

import { useState } from 'react';
import { ComponentDemo } from '../component-demo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { UsageItem } from '../usage-info';

interface DemoProps {
  usages?: UsageItem[];
}

export function TabsDemo({ usages }: DemoProps) {
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
      usages={usages}
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

export function CollapsibleDemo({ usages }: DemoProps) {
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
      usages={usages}
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

export function ToggleDemo({ usages }: DemoProps) {
  const [pressed, setPressed] = useState(false);

  const code = `<Toggle pressed={${pressed}} onPressedChange={setPressed}>
  <Bold className="h-4 w-4" />
</Toggle>`;

  return (
    <ComponentDemo
      title="Toggle"
      description="Переключатель с двумя состояниями"
      usages={usages}
      preview={
        <div className="flex gap-2">
          <Toggle pressed={pressed} onPressedChange={setPressed} aria-label="Toggle bold">
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle aria-label="Toggle italic">
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle aria-label="Toggle underline">
            <Underline className="h-4 w-4" />
          </Toggle>
        </div>
      }
      code={code}
    />
  );
}

export function ToggleGroupDemo({ usages }: DemoProps) {
  const [value, setValue] = useState('left');

  const code = `<ToggleGroup type="single" value="${value}" onValueChange={setValue}>
  <ToggleGroupItem value="left" aria-label="Align left">
    <AlignLeft className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="center" aria-label="Align center">
    <AlignCenter className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="right" aria-label="Align right">
    <AlignRight className="h-4 w-4" />
  </ToggleGroupItem>
</ToggleGroup>`;

  return (
    <ComponentDemo
      title="ToggleGroup"
      description="Группа переключателей для выбора одного варианта"
      usages={usages}
      preview={
        <ToggleGroup type="single" value={value} onValueChange={(v) => v && setValue(v)}>
          <ToggleGroupItem value="left" aria-label="Align left">
            <AlignLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Align center">
            <AlignCenter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Align right">
            <AlignRight className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      }
      code={code}
    />
  );
}
