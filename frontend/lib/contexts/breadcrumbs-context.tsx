'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface BreadcrumbsContextType {
  customTitle: string | null;
  setCustomTitle: (title: string | null) => void;
}

const BreadcrumbsContext = createContext<BreadcrumbsContextType | undefined>(undefined);

export function BreadcrumbsProvider({ children }: { children: ReactNode }) {
  const [customTitle, setCustomTitle] = useState<string | null>(null);

  return (
    <BreadcrumbsContext.Provider value={{ customTitle, setCustomTitle }}>
      {children}
    </BreadcrumbsContext.Provider>
  );
}

export function useBreadcrumbs() {
  const context = useContext(BreadcrumbsContext);
  if (!context) {
    throw new Error('useBreadcrumbs must be used within BreadcrumbsProvider');
  }
  return context;
}
