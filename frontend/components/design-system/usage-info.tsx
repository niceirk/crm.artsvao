'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

export interface UsageItem {
  path: string;
  label: string;
}

export interface UsageInfoProps {
  usages: UsageItem[];
}

export function UsageInfo({ usages }: UsageInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (usages.length === 0) {
    return (
      <Badge variant="secondary" className="text-xs">
        Не используется
      </Badge>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-1 hover:opacity-80 transition-opacity">
          <Badge variant="outline" className="text-xs cursor-pointer">
            {isOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
            Используется в {usages.length} {getPlural(usages.length, 'месте', 'местах', 'местах')}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="flex flex-wrap gap-1.5">
          {usages.map((usage, index) => (
            <Link
              key={index}
              href={usage.path}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors bg-muted/50 px-2 py-1 rounded"
            >
              {usage.label}
              <ExternalLink className="h-3 w-3" />
            </Link>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function getPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few;
  }
  return many;
}
