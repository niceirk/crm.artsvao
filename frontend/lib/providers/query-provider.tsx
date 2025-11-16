'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
            gcTime: 10 * 60 * 1000, // 10 минут - время хранения в кэше
            refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
            refetchOnMount: true, // Перезапрашивать только при монтировании если данные устарели
            refetchOnReconnect: true, // Перезапрашивать при восстановлении соединения
            retry: 1, // Одна попытка повтора при ошибке
          },
          mutations: {
            retry: 0, // Не повторять мутации при ошибке
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
