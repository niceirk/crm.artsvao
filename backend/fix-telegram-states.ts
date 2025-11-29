import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTelegramStates() {
  console.log('Fixing telegram account states...\n');

  // 1. Исправить аккаунты с неправильными состояниями (UNKNOWN и другие некорректные)
  // Непривязанные аккаунты (без clientId) должны быть NEW_USER
  const result1 = await prisma.$executeRaw`
    UPDATE telegram_accounts
    SET state = 'NEW_USER'
    WHERE client_id IS NULL
    AND state NOT IN ('NEW_USER', 'WAITING_FOR_PHONE', 'GUEST');
  `;
  console.log(`✅ Исправлено ${result1} непривязанных аккаунтов с некорректным состоянием`);

  // 2. Привязанные аккаунты должны быть IDENTIFIED или BOUND_MANUALLY
  const result2 = await prisma.$executeRaw`
    UPDATE telegram_accounts
    SET state = 'IDENTIFIED'
    WHERE client_id IS NOT NULL
    AND state NOT IN ('IDENTIFIED', 'BOUND_MANUALLY');
  `;
  console.log(`✅ Исправлено ${result2} привязанных аккаунтов с некорректным состоянием`);

  // 3. Показать текущее состояние
  const accounts = await prisma.telegramAccount.findMany({
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      clientId: true,
      state: true,
    },
  });

  console.log(`\nВсего Telegram аккаунтов: ${accounts.length}\n`);

  accounts.forEach((acc) => {
    const name = `${acc.firstName} ${acc.lastName || ''}`.trim();
    const username = acc.username ? `@${acc.username}` : 'N/A';
    const clientStatus = acc.clientId ? '✅ Привязан' : '❌ Не привязан';
    console.log(`${username} (${name}): ${acc.state} - ${clientStatus}`);
  });
}

fixTelegramStates()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
