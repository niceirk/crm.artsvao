import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Удаление тестовых данных из модуля сообщений...\n');

  // 1. Удаляем все сообщения
  const deletedMessages = await prisma.message.deleteMany({});
  console.log(`✅ Удалено сообщений: ${deletedMessages.count}`);

  // 2. Удаляем все диалоги
  const deletedConversations = await prisma.conversation.deleteMany({});
  console.log(`✅ Удалено диалогов: ${deletedConversations.count}`);

  // 3. Удаляем все Telegram аккаунты
  const deletedTelegramAccounts = await prisma.telegramAccount.deleteMany({});
  console.log(`✅ Удалено Telegram аккаунтов: ${deletedTelegramAccounts.count}`);

  // 4. Удаляем шаблоны уведомлений (если есть)
  const deletedTemplates = await prisma.notificationTemplate.deleteMany({});
  console.log(`✅ Удалено шаблонов уведомлений: ${deletedTemplates.count}`);

  console.log('\n✨ Все данные модуля сообщений успешно удалены!');
  console.log('Теперь можно протестировать заново.');
}

main()
  .catch((error) => {
    console.error('❌ Ошибка при удалении данных:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
