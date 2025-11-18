const { PrismaClient } = require('@prisma/client');

// Локальная БД
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://artsvao_user:artsvao_password@localhost:5432/artsvao_db'
    }
  }
});

// Облачная БД
const cloudPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://gen_user:5_7qsroh-hDw%40_@ad58d335a4d560f18508292d.twc1.net:5432/default_db?schema=public&sslmode=require'
    }
  }
});

async function migrateData() {
  try {
    console.log('🚀 Начинаем миграцию данных...');

    // Получаем всех пользователей из локальной БД
    const users = await localPrisma.user.findMany();
    console.log(`📊 Найдено пользователей: ${users.length}`);

    if (users.length === 0) {
      console.log('⚠️  Нет пользователей для переноса');
      return;
    }

    // Копируем пользователей в облачную БД
    for (const user of users) {
      try {
        await cloudPrisma.user.create({
          data: user
        });
        console.log(`✅ Скопирован: ${user.email}`);
      } catch (err) {
        if (err.code === 'P2002') {
          console.log(`⏭️  Пропущен (уже существует): ${user.email}`);
        } else {
          console.error(`❌ Ошибка при копировании ${user.email}:`, err.message);
        }
      }
    }

    console.log('✨ Миграция завершена!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await localPrisma.$disconnect();
    await cloudPrisma.$disconnect();
  }
}

migrateData();
