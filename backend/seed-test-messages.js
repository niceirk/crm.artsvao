const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTestData() {
  try {
    console.log('🌱 Создаем тестовые данные для мессенджера...\n');

    // Получаем первого клиента из БД
    const client = await prisma.client.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!client) {
      console.log('❌ Нет активных клиентов в БД. Создайте клиента сначала.');
      return;
    }

    console.log(`✅ Используем клиента: ${client.firstName} ${client.lastName}`);

    // 1. Создаем Telegram аккаунт для клиента
    const telegramAccount = await prisma.telegramAccount.create({
      data: {
        clientId: client.id,
        telegramUserId: '123456789',
        chatId: '123456789',
        username: 'test_user',
        firstName: client.firstName,
        lastName: client.lastName,
        isNotificationsEnabled: true,
        state: 'IDENTIFIED',
      },
    });

    console.log(`✅ Создан Telegram аккаунт: @${telegramAccount.username}`);

    // 2. Создаем диалог
    const conversation = await prisma.conversation.create({
      data: {
        clientId: client.id,
        channelAccountId: telegramAccount.id,
        source: 'TELEGRAM',
        status: 'OPEN',
        lastMessageAt: new Date(),
      },
    });

    console.log(`✅ Создан диалог ID: ${conversation.id}`);

    // 3. Создаем тестовые сообщения
    const messages = [
      {
        conversationId: conversation.id,
        direction: 'INBOUND',
        senderType: 'CLIENT',
        text: 'Здравствуйте! Хочу записаться на занятие.',
        category: 'CHAT',
        isReadByClient: true,
        isReadByManager: false,
        createdAt: new Date(Date.now() - 3600000), // 1 час назад
      },
      {
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        senderType: 'MANAGER',
        text: 'Добрый день! Конечно, подскажите, на какое занятие вы хотите записаться?',
        category: 'CHAT',
        isReadByClient: false,
        isReadByManager: true,
        createdAt: new Date(Date.now() - 3000000), // 50 минут назад
      },
      {
        conversationId: conversation.id,
        direction: 'INBOUND',
        senderType: 'CLIENT',
        text: 'На йогу, если есть места',
        category: 'CHAT',
        isReadByClient: true,
        isReadByManager: false,
        createdAt: new Date(Date.now() - 1800000), // 30 минут назад
      },
      {
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        senderType: 'SYSTEM',
        text: '✅ Подтверждение оплаты\n\nВаш платеж на сумму 3500 руб. успешно обработан.\n\nСпасибо!',
        category: 'PAYMENT',
        isReadByClient: true,
        isReadByManager: true,
        createdAt: new Date(Date.now() - 600000), // 10 минут назад
      },
    ];

    for (const msgData of messages) {
      await prisma.message.create({ data: msgData });
    }

    console.log(`✅ Создано ${messages.length} тестовых сообщений`);

    // 4. Создаем еще один диалог (не привязанный к клиенту)
    const guestTelegramAccount = await prisma.telegramAccount.create({
      data: {
        telegramUserId: '987654321',
        chatId: '987654321',
        username: 'guest_user',
        firstName: 'Гость',
        lastName: null,
        isNotificationsEnabled: true,
        state: 'NEW_USER',
      },
    });

    const guestConversation = await prisma.conversation.create({
      data: {
        channelAccountId: guestTelegramAccount.id,
        source: 'TELEGRAM',
        status: 'OPEN',
        lastMessageAt: new Date(),
      },
    });

    await prisma.message.create({
      data: {
        conversationId: guestConversation.id,
        direction: 'INBOUND',
        senderType: 'CLIENT',
        text: 'Здравствуйте! Расскажите подробнее о ваших услугах',
        category: 'CHAT',
        isReadByClient: true,
        isReadByManager: false,
      },
    });

    console.log(`✅ Создан диалог от гостя (не привязан к клиенту)`);

    console.log('\n✨ Тестовые данные успешно созданы!');
    console.log('\n📱 Откройте http://localhost:3001/messages для просмотра\n');

  } catch (error) {
    console.error('❌ Ошибка при создании данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();
