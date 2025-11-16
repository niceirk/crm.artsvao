'use client';

import { ComponentDemo } from '../component-demo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ColorsDemo() {
  const colors = [
    { name: 'Background', var: '--background', text: '--foreground' },
    { name: 'Primary', var: '--primary', text: '--primary-foreground' },
    { name: 'Secondary', var: '--secondary', text: '--secondary-foreground' },
    { name: 'Muted', var: '--muted', text: '--muted-foreground' },
    { name: 'Accent', var: '--accent', text: '--accent-foreground' },
    { name: 'Destructive', var: '--destructive', text: '--destructive-foreground' },
    { name: 'Border', var: '--border', text: '--foreground' },
  ];

  const code = `/* CSS переменные в globals.css */
--background: 0 0% 100%;
--foreground: 0 0% 3.9%;
--primary: 0 0% 9%;
--secondary: 0 0% 96.1%;
--muted: 0 0% 96.1%;
--accent: 0 0% 96.1%;
--destructive: 0 84.2% 60.2%;
--border: 0 0% 89.8%;

/* Использование в Tailwind */
className="bg-primary text-primary-foreground"
className="bg-secondary text-secondary-foreground"`;

  return (
    <ComponentDemo
      title="Цветовая палитра"
      description="Семантические цвета design system"
      preview={
        <div className="grid grid-cols-2 gap-4 w-full">
          {colors.map((color) => (
            <div key={color.name} className="space-y-2">
              <div
                className="h-20 rounded-md border flex items-center justify-center text-sm font-medium"
                style={{
                  backgroundColor: `hsl(var(${color.var}))`,
                  color: `hsl(var(${color.text}))`,
                }}
              >
                {color.name}
              </div>
              <p className="text-xs text-muted-foreground font-mono">{color.var}</p>
            </div>
          ))}
        </div>
      }
      code={code}
    />
  );
}

export function TypographyDemo() {
  const code = `<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
  Heading 1
</h1>

<h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
  Heading 2
</h2>

<h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
  Heading 3
</h3>

<p className="leading-7">
  Обычный текст параграфа
</p>

<p className="text-sm text-muted-foreground">
  Вспомогательный текст
</p>`;

  return (
    <ComponentDemo
      title="Типография"
      description="Стили текста и заголовков"
      preview={
        <div className="space-y-4 w-full text-left">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Heading 1
          </h1>
          <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
            Heading 2
          </h2>
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            Heading 3
          </h3>
          <p className="leading-7">
            Обычный текст параграфа с нормальной высотой строки
          </p>
          <p className="text-sm text-muted-foreground">
            Вспомогательный текст меньшего размера
          </p>
          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
            Моноширинный код
          </code>
        </div>
      }
      code={code}
    />
  );
}

export function SpacingDemo() {
  const spacings = [
    { size: '0.5', px: '2px', class: 'p-0.5' },
    { size: '1', px: '4px', class: 'p-1' },
    { size: '2', px: '8px', class: 'p-2' },
    { size: '4', px: '16px', class: 'p-4' },
    { size: '6', px: '24px', class: 'p-6' },
    { size: '8', px: '32px', class: 'p-8' },
  ];

  const code = `/* Tailwind spacing classes */
p-1    /* padding: 4px */
p-2    /* padding: 8px */
p-4    /* padding: 16px */
p-6    /* padding: 24px */
p-8    /* padding: 32px */

m-1    /* margin: 4px */
gap-4  /* gap: 16px */
space-y-4  /* vertical spacing: 16px */`;

  return (
    <ComponentDemo
      title="Отступы"
      description="Система отступов"
      preview={
        <div className="space-y-2 w-full">
          {spacings.map((spacing) => (
            <div key={spacing.size} className="flex items-center gap-4">
              <div className="w-20 text-sm font-mono">{spacing.class}</div>
              <div className="w-16 text-sm text-muted-foreground">{spacing.px}</div>
              <div
                className="bg-primary"
                style={{ width: spacing.px, height: '24px' }}
              />
            </div>
          ))}
        </div>
      }
      code={code}
    />
  );
}

export function BorderRadiusDemo() {
  const radiuses = [
    { name: 'sm', value: 'calc(var(--radius) - 4px)', class: 'rounded-sm' },
    { name: 'md', value: 'calc(var(--radius) - 2px)', class: 'rounded-md' },
    { name: 'lg', value: 'var(--radius)', class: 'rounded-lg' },
    { name: 'full', value: '9999px', class: 'rounded-full' },
  ];

  const code = `/* CSS переменная */
--radius: 0.5rem; /* 8px */

/* Tailwind classes */
rounded-sm   /* 4px */
rounded-md   /* 6px */
rounded-lg   /* 8px */
rounded-full /* полностью закругленный */`;

  return (
    <ComponentDemo
      title="Скругление углов"
      description="Система border-radius"
      preview={
        <div className="grid grid-cols-2 gap-4 w-full">
          {radiuses.map((radius) => (
            <div key={radius.name} className="space-y-2">
              <div
                className={`h-20 bg-primary ${radius.class} flex items-center justify-center text-primary-foreground text-sm font-medium`}
              >
                {radius.name}
              </div>
              <p className="text-xs text-muted-foreground font-mono">{radius.class}</p>
            </div>
          ))}
        </div>
      }
      code={code}
    />
  );
}
