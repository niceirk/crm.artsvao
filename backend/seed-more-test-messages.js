const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedMoreTestData() {
  try {
    console.log('🌱 Создаем дополнительные тестовые диалоги...\n');

    // Получаем клиентов
    const clients = await prisma.client.findMany({
      where: { status: 'ACTIVE' },
      take: 5,
    });

    if (clients.length === 0) {
      console.log('❌ Нет клиентов в БД');
      return;
    }

    const testDialogs = [
      {
        client: clients[0],
        username: 'ivan_ivanov',
        messages: [
          { type: 'CLIENT', text: 'Добрый день! Можно записаться на пробное занятие?', minutesAgo: 120 },
          { type: 'MANAGER', text: 'Здравствуйте! Конечно, на какую группу вы хотите записаться?', minutesAgo: 115 },
          { type: 'CLIENT', text: 'На танцы для детей 7 лет', minutesAgo: 110 },
          { type: 'MANAGER', text: 'Отлично! У нас есть группа по вторникам и четвергам в 17:00. Подойдет?', minutesAgo: 105 },
          { type: 'CLIENT', text: 'Да, подходит! Как записаться?', minutesAgo: 10 },
        ],
      },
      {
        client: clients[1] || clients[0],
        username: 'maria_petrova',
        messages: [
          { type: 'CLIENT', text: 'Здравствуйте! У меня вопрос по оплате абонемента', minutesAgo: 60 },
          { type: 'MANAGER', text: 'Добрый день! Слушаю вас', minutesAgo: 58 },
          { type: 'CLIENT', text: 'Можно оплатить картой?', minutesAgo: 55 },
          { type: 'MANAGER', text: 'Да, мы принимаем оплату картой. Отправлю вам ссылку для оплаты', minutesAgo: 50 },
          { type: 'SYSTEM', text: '💳 Счет на оплату\n\nАбонемент: 8 занятий\nСумма: 5600 руб.\n\nОплатите по ссылке: https://pay.artsvao.ru/...', minutesAgo: 49 },
          { type: 'CLIENT', text: 'Спасибо, оплачу сегодня вечером', minutesAgo: 5 },
        ],
      },
      {
        client: clients[2] || clients[0],
        username: 'alex_sidorov',
        messages: [
          { type: 'CLIENT', text: 'Здравствуйте!', minutesAgo: 180 },
          { type: 'MANAGER', text: 'Добрый день! Чем могу помочь?', minutesAgo: 175 },
          { type: 'CLIENT', text: 'Хочу узнать расписание на следующую неделю', minutesAgo: 170 },
        ],
        status: 'CLOSED',
      },
      {
        client: null,
        username: 'guest_user_1',
        firstName: 'Анна',
        messages: [
          { type: 'CLIENT', text: 'Добрый день! А у вас есть йога для начинающих?', minutesAgo: 30 },
        ],
      },
      {
        client: null,
        username: 'guest_user_2',
        firstName: 'Дмитрий',
        messages: [
          { type: 'CLIENT', text: 'Здравствуйте! Подскажите цены на абонементы', minutesAgo: 90 },
          { type: 'MANAGER', text: 'Здравствуйте! Абонемент на 4 занятия - 2800 руб, на 8 занятий - 5200 руб', minutesAgo: 85 },
          { type: 'CLIENT', text: 'А есть скидки?', minutesAgo: 2 },
        ],
      },
    ];

    for (let i = 0; i < testDialogs.length; i++) {
      const dialog = testDialogs[i];
      const telegramUserId = `${200000 + i}`;
      const chatId = `${200000 + i}`;

      // Создаем Telegram аккаунт
      const telegramAccount = await prisma.telegramAccount.create({
        data: {
          clientId: dialog.client?.id || null,
          telegramUserId: BigInt(telegramUserId),
          chatId: BigInt(chatId),
          username: dialog.username,
          firstName: dialog.firstName || dialog.client?.firstName || 'Пользователь',
          lastName: dialog.client?.lastName || null,
          isNotificationsEnabled: true,
          state: dialog.client ? 'IDENTIFIED' : 'GUEST',
        },
      });

      // Создаем диалог
      const lastMessageTime = new Date(Date.now() - dialog.messages[dialog.messages.length - 1].minutesAgo * 60000);
      const conversation = await prisma.conversation.create({
        data: {
          clientId: dialog.client?.id || null,
          channelAccountId: telegramAccount.id,
          source: 'TELEGRAM',
          status: dialog.status || 'OPEN',
          lastMessageAt: lastMessageTime,
        },
      });

      // Создаем сообщения
      for (const msg of dialog.messages) {
        const direction = msg.type === 'CLIENT' ? 'INBOUND' : 'OUTBOUND';
        const senderType = msg.type;
        const category = msg.type === 'SYSTEM' ? 'PAYMENT' : 'CHAT';
        const createdAt = new Date(Date.now() - msg.minutesAgo * 60000);

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            direction,
            senderType,
            text: msg.text,
            category,
            isReadByClient: true,
            isReadByManager: msg.type === 'MANAGER' || msg.type === 'SYSTEM',
            createdAt,
          },
        });
      }

      const clientName = dialog.client
        ? `${dialog.client.firstName} ${dialog.client.lastName}`
        : dialog.firstName || 'Гость';
      console.log(`✅ Создан диалог: ${clientName} (@${dialog.username}) - ${dialog.messages.length} сообщений`);
    }

    console.log('\n✨ Дополнительные тестовые диалоги созданы!');
    console.log('📱 Обновите страницу http://localhost:3001/messages\n');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMoreTestData();
