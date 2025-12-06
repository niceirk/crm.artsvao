/**
 * Shared PrismaClient для CLI-скриптов.
 *
 * Использует маленький пул соединений (connection_limit=2) чтобы
 * не конкурировать с основным приложением за соединения к облачной БД.
 *
 * @example
 * import { getCliPrismaClient, disconnectCliPrisma } from './lib/prisma-cli';
 *
 * async function main() {
 *   const prisma = getCliPrismaClient();
 *   // ... работа с БД
 *   await disconnectCliPrisma();
 * }
 */

import { PrismaClient } from '@prisma/client';

let sharedClient: PrismaClient | null = null;

/**
 * Получить singleton PrismaClient для CLI скриптов.
 * Использует меньший пул соединений, чтобы не конкурировать с основным приложением.
 */
export function getCliPrismaClient(): PrismaClient {
  if (!sharedClient) {
    const baseUrl = process.env.DATABASE_URL || '';

    // Модифицируем URL для CLI - уменьшаем пул
    let modifiedUrl = baseUrl;
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('connection_limit', '2');
      url.searchParams.set('pool_timeout', '10');
      modifiedUrl = url.toString();
    } catch {
      // Если URL невалидный, используем как есть с добавлением параметров
      const separator = baseUrl.includes('?') ? '&' : '?';
      modifiedUrl = `${baseUrl}${separator}connection_limit=2&pool_timeout=10`;
    }

    sharedClient = new PrismaClient({
      datasources: {
        db: { url: modifiedUrl },
      },
      log: ['error', 'warn'],
    });

    // Регистрируем cleanup при завершении процесса
    process.on('beforeExit', async () => {
      await disconnectCliPrisma();
    });

    process.on('SIGINT', async () => {
      await disconnectCliPrisma();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await disconnectCliPrisma();
      process.exit(0);
    });
  }

  return sharedClient;
}

/**
 * Отключить CLI PrismaClient.
 * Вызывайте в конце скрипта для корректного завершения.
 */
export async function disconnectCliPrisma(): Promise<void> {
  if (sharedClient) {
    try {
      await sharedClient.$disconnect();
    } catch (error) {
      console.error('Error disconnecting CLI Prisma client:', error);
    }
    sharedClient = null;
  }
}
