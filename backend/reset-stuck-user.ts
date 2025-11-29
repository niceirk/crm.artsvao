import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetStuckUser() {
  try {
    // Находим пользователя в состоянии CHOOSING_FROM_MULTIPLE
    const stuckUser = await prisma.telegramAccount.findFirst({
      where: {
        state: 'CHOOSING_FROM_MULTIPLE',
      },
    });

    if (!stuckUser) {
      console.log('Нет пользователей в состоянии CHOOSING_FROM_MULTIPLE');
      return;
    }

    console.log('\n=== Застрявший пользователь ===');
    console.log('Telegram User ID:', stuckUser.telegramUserId.toString());
    console.log('Username:', stuckUser.username);
    console.log('Имя:', stuckUser.firstName, stuckUser.lastName);
    console.log('Текущее состояние:', stuckUser.state);

    // Сбрасываем состояние на NEW_USER
    await prisma.telegramAccount.update({
      where: { id: stuckUser.id },
      data: { state: 'NEW_USER' },
    });

    console.log('\n✅ Состояние сброшено на NEW_USER');
    console.log('При следующем сообщении пользователю будет предложена идентификация заново.');
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetStuckUser();
