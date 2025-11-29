const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanTestData() {
  try {
    console.log('🧹 Удаляем тестовые данные...\n');

    // Удаляем все сообщения
    const deletedMessages = await prisma.message.deleteMany({});
    console.log(`✅ Удалено сообщений: ${deletedMessages.count}`);

    // Удаляем все диалоги
    const deletedConversations = await prisma.conversation.deleteMany({});
    console.log(`✅ Удалено диалогов: ${deletedConversations.count}`);

    // Удаляем все Telegram аккаунты
    const deletedAccounts = await prisma.telegramAccount.deleteMany({});
    console.log(`✅ Удалено Telegram аккаунтов: ${deletedAccounts.count}`);

    console.log('\n✨ Тестовые данные успешно удалены!\n');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanTestData();
