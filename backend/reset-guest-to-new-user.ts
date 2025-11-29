import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetGuestAccounts() {
  console.log('Сброс GUEST аккаунтов на NEW_USER для повторной идентификации...\n');

  // Сбросить все непривязанные GUEST аккаунты на NEW_USER
  // Это позволит боту снова предложить идентификацию
  const result = await prisma.telegramAccount.updateMany({
    where: {
      clientId: null,
      state: 'GUEST',
    },
    data: {
      state: 'NEW_USER',
    },
  });

  console.log(`✅ Сброшено ${result.count} аккаунтов с GUEST на NEW_USER`);

  // Показать обновленный список
  const accounts = await prisma.telegramAccount.findMany({
    where: { clientId: null },
    select: {
      username: true,
      firstName: true,
      state: true,
    },
  });

  console.log('\nНепривязанные аккаунты:');
  accounts.forEach((acc) => {
    console.log(`  @${acc.username || 'N/A'} (${acc.firstName}): ${acc.state}`);
  });
}

resetGuestAccounts()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
