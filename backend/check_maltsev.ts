import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Ищем всех клиентов с фамилией Мальцев
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { lastName: { contains: 'Мальцев', mode: 'insensitive' } },
        { lastName: { contains: 'Maltsev', mode: 'insensitive' } },
      ]
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      telegramAccounts: {
        select: {
          id: true,
          telegramUserId: true,
          firstName: true,
          lastName: true,
        }
      }
    }
  });

  console.log('=== Клиенты Мальцевы ===');
  for (const client of clients) {
    console.log(`\nКлиент: ${client.lastName} ${client.firstName} (${client.id})`);
    console.log(`Телефон: ${client.phone}`);
    console.log(`Telegram аккаунтов: ${client.telegramAccounts.length}`);

    for (const tg of client.telegramAccounts) {
      console.log(`  - TG Account ${tg.id}: ${tg.firstName} ${tg.lastName} (User ID: ${tg.telegramUserId})`);

      // Ищем диалоги для этого TG аккаунта
      const conversations = await prisma.conversation.findMany({
        where: { channelAccountId: tg.id },
        select: {
          id: true,
          status: true,
          createdAt: true,
        }
      });

      console.log(`    Диалогов: ${conversations.length}`);
      conversations.forEach((conv: any) => {
        console.log(`      - ${conv.id} (${conv.status}) создан: ${conv.createdAt}`);
      });
    }
  }

  // Также ищем TelegramAccount с именем Никита и фамилией Мальцев
  console.log('\n=== Telegram аккаунты Мальцев Никита ===');
  const tgAccounts = await prisma.telegramAccount.findMany({
    where: {
      AND: [
        { firstName: { contains: 'Никита', mode: 'insensitive' } },
        { lastName: { contains: 'Мальцев', mode: 'insensitive' } },
      ]
    },
    select: {
      id: true,
      telegramUserId: true,
      firstName: true,
      lastName: true,
      clientId: true,
    }
  });

  for (const tg of tgAccounts) {
    console.log(`\nTG Account ${tg.id}:`);
    console.log(`  User ID: ${tg.telegramUserId}`);
    console.log(`  Имя: ${tg.firstName} ${tg.lastName}`);
    console.log(`  Привязан к клиенту: ${tg.clientId || 'не привязан'}`);

    const conversations = await prisma.conversation.findMany({
      where: { channelAccountId: tg.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
      }
    });

    console.log(`  Диалогов: ${conversations.length}`);
    conversations.forEach((conv: any) => {
      console.log(`    - ${conv.id} (${conv.status}) создан: ${conv.createdAt}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
