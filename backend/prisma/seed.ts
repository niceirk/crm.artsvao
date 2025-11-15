import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...\n');

  // Создать администратора
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@artsvao.ru' },
    update: {},
    create: {
      email: 'admin@artsvao.ru',
      passwordHash: adminPassword,
      role: 'ADMIN',
      firstName: 'Администратор',
      lastName: 'Системы',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created admin user:', {
    email: admin.email,
    role: admin.role,
    status: admin.status,
  });

  // Создать тестового менеджера
  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@artsvao.ru' },
    update: {},
    create: {
      email: 'manager@artsvao.ru',
      passwordHash: managerPassword,
      role: 'MANAGER',
      firstName: 'Менеджер',
      lastName: 'Тестовый',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created manager user:', {
    email: manager.email,
    role: manager.role,
    status: manager.status,
  });

  // Создать помещения
  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        name: 'Большой зал',
        number: '101',
        capacity: 50,
        type: 'HALL',
        hourlyRate: 2000,
        dailyRate: 15000,
      },
    }),
    prisma.room.create({
      data: {
        name: 'Танцевальная студия',
        number: '201',
        capacity: 20,
        type: 'STUDIO',
        hourlyRate: 1500,
        dailyRate: 10000,
      },
    }),
    prisma.room.create({
      data: {
        name: 'Класс для занятий',
        number: '301',
        capacity: 15,
        type: 'CLASS',
        hourlyRate: 1000,
        dailyRate: 7000,
      },
    }),
  ]);

  console.log(`\n✅ Created ${rooms.length} rooms`);

  // Создать преподавателей
  const teachers = await Promise.all([
    prisma.teacher.create({
      data: {
        firstName: 'Мария',
        lastName: 'Иванова',
        middleName: 'Петровна',
        phone: '+79001234567',
        email: 'maria.ivanova@artsvao.ru',
        specialization: 'Хореография',
        salaryPercentage: 40.0,
      },
    }),
    prisma.teacher.create({
      data: {
        firstName: 'Анна',
        lastName: 'Сидорова',
        middleName: 'Александровна',
        phone: '+79007654321',
        email: 'anna.sidorova@artsvao.ru',
        specialization: 'Вокал',
        salaryPercentage: 35.0,
      },
    }),
  ]);

  console.log(`✅ Created ${teachers.length} teachers`);

  // Создать студии
  const studios = await Promise.all([
    prisma.studio.create({
      data: {
        name: 'Современные танцы',
        description: 'Занятия современной хореографией для детей и взрослых',
        type: 'GROUP',
        category: 'Танцы',
      },
    }),
    prisma.studio.create({
      data: {
        name: 'Вокальная студия',
        description: 'Обучение вокалу и сценическому мастерству',
        type: 'BOTH',
        category: 'Музыка',
      },
    }),
  ]);

  console.log(`✅ Created ${studios.length} studios`);

  // Создать группы
  const groups = await Promise.all([
    prisma.group.create({
      data: {
        name: 'Современные танцы - младшая группа',
        studioId: studios[0].id,
        teacherId: teachers[0].id,
        roomId: rooms[1].id,
        maxParticipants: 15,
        singleSessionPrice: 500,
        ageMin: 7,
        ageMax: 12,
      },
    }),
    prisma.group.create({
      data: {
        name: 'Вокал - средняя группа',
        studioId: studios[1].id,
        teacherId: teachers[1].id,
        roomId: rooms[2].id,
        maxParticipants: 10,
        singleSessionPrice: 600,
        ageMin: 10,
        ageMax: 16,
      },
    }),
  ]);

  console.log(`✅ Created ${groups.length} groups`);

  // Создать типы абонементов
  const subscriptionTypes = await Promise.all([
    prisma.subscriptionType.create({
      data: {
        name: 'Безлимитный абонемент',
        description: 'Неограниченное посещение занятий группы в течение месяца',
        groupId: groups[0].id,
        type: 'UNLIMITED',
        price: 4000,
      },
    }),
    prisma.subscriptionType.create({
      data: {
        name: 'Абонемент на 8 занятий',
        description: '8 занятий в месяц',
        groupId: groups[0].id,
        type: 'SINGLE_VISIT',
        price: 3200,
      },
    }),
    prisma.subscriptionType.create({
      data: {
        name: 'Безлимитный абонемент',
        description: 'Неограниченное посещение занятий группы в течение месяца',
        groupId: groups[1].id,
        type: 'UNLIMITED',
        price: 5000,
      },
    }),
  ]);

  console.log(`✅ Created ${subscriptionTypes.length} subscription types`);

  // Создать системные настройки
  const systemSettings = await prisma.systemSettings.upsert({
    where: { id: 'system' },
    update: {},
    create: {
      id: 'system',
      organizationName: 'Культурный центр',
      legalName: 'ООО "Культурный центр"',
      address: 'Москва, ул. Примерная, д. 1',
      phone: '+7 (495) 123-45-67',
      email: 'info@artsvao.ru',
      website: 'https://artsvao.ru',
      workingHours: {
        monday: { open: '09:00', close: '21:00' },
        tuesday: { open: '09:00', close: '21:00' },
        wednesday: { open: '09:00', close: '21:00' },
        thursday: { open: '09:00', close: '21:00' },
        friday: { open: '09:00', close: '21:00' },
        saturday: { open: '10:00', close: '18:00' },
        sunday: { closed: true },
      },
    },
  });

  console.log('\n✅ Created system settings');

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📋 Summary:');
  console.log(`   - 2 users (1 admin, 1 manager)`);
  console.log(`   - ${rooms.length} rooms`);
  console.log(`   - ${teachers.length} teachers`);
  console.log(`   - ${studios.length} studios`);
  console.log(`   - ${groups.length} groups`);
  console.log(`   - ${subscriptionTypes.length} subscription types`);
  console.log(`   - System settings initialized`);
  console.log('\n💡 Login credentials:');
  console.log('   Admin: admin@artsvao.ru / admin123');
  console.log('   Manager: manager@artsvao.ru / manager123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
