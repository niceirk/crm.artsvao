const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.telegramAccount.findMany({
    include: {
      conversations: {
        include: {
          messages: {
            take: 3,
            orderBy: { createdAt: 'asc' }
          }
        }
      }
    }
  });

  for (const acc of accounts) {
    console.log(`\n👤 ${acc.firstName} (@${acc.username || 'no username'})`);
    console.log(`   User ID: ${acc.telegramUserId}`);
    console.log(`   Chat ID: ${acc.chatId}`);
    console.log(`   State: ${acc.state}`);
    console.log(`   Диалогов: ${acc.conversations.length}`);

    if (acc.conversations.length > 0) {
      const conv = acc.conversations[0];
      console.log(`   Сообщений: ${conv.messages.length}`);
      if (conv.messages.length > 0) {
        console.log(`   Первое сообщение: "${conv.messages[0].text}"`);
      }
    }
  }

  await prisma.$disconnect();
}

main();
