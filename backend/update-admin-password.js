const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const cloudPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://gen_user:5_7qsroh-hDw%40_@ad58d335a4d560f18508292d.twc1.net:5432/default_db?schema=public&sslmode=require'
    }
  }
});

async function updatePassword() {
  try {
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('🔐 Обновляем пароль для admin@artsvao.ru...');

    const updated = await cloudPrisma.user.update({
      where: { email: 'admin@artsvao.ru' },
      data: { password: hashedPassword }
    });

    console.log('✅ Пароль успешно обновлен для:', updated.email);
    console.log('📧 Email:', updated.email);
    console.log('🔑 Новый пароль: admin123');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await cloudPrisma.$disconnect();
  }
}

updatePassword();
