import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Создаем admin пользователя если его нет
  const adminEmail = 'admin@artsvao.ru';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin123', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        firstName: 'Администратор',
        lastName: 'Системы',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });
    console.log('✅ Admin user created');
  } else {
    console.log('ℹ️  Admin user already exists');
  }

  // Создаем источники привлечения
  const leadSources = [
    {
      name: 'Соцсети',
      description: 'Клиенты из социальных сетей (VK, Instagram, Facebook)',
      isActive: true,
    },
    {
      name: 'Рекомендации',
      description: 'Клиенты пришли по рекомендации других клиентов',
      isActive: true,
    },
    {
      name: 'Реклама',
      description: 'Клиенты из рекламных кампаний',
      isActive: true,
    },
    {
      name: 'Сайт',
      description: 'Заявки с официального сайта',
      isActive: true,
    },
    {
      name: 'Холодные звонки',
      description: 'Клиенты найдены через холодные звонки',
      isActive: false,
    },
  ];

  for (const source of leadSources) {
    const existing = await prisma.leadSource.findUnique({
      where: { name: source.name },
    });

    if (!existing) {
      await prisma.leadSource.create({
        data: source,
      });
      console.log(`✅ Lead source "${source.name}" created`);
    } else {
      console.log(`ℹ️  Lead source "${source.name}" already exists`);
    }
  }

  console.log('\n🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
