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

  // Создать льготные категории
  const benefitCategories = await Promise.all([
    prisma.benefitCategory.upsert({
      where: { name: 'Нет льготы' },
      update: {},
      create: {
        name: 'Нет льготы',
        discountPercent: 0,
        description: 'Без применения льгот',
        requiresDocument: false,
      },
    }),
    prisma.benefitCategory.upsert({
      where: { name: 'Пенсионер' },
      update: {},
      create: {
        name: 'Пенсионер',
        discountPercent: 20,
        description: 'Скидка для пенсионеров',
        requiresDocument: true,
      },
    }),
    prisma.benefitCategory.upsert({
      where: { name: 'Многодетная семья' },
      update: {},
      create: {
        name: 'Многодетная семья',
        discountPercent: 30,
        description: 'Скидка для многодетных семей',
        requiresDocument: true,
      },
    }),
    prisma.benefitCategory.upsert({
      where: { name: 'Сотрудник' },
      update: {},
      create: {
        name: 'Сотрудник',
        discountPercent: 100,
        description: 'Бесплатно для сотрудников культурного центра',
        requiresDocument: false,
      },
    }),
  ]);

  console.log(`✅ Created ${benefitCategories.length} benefit categories`);

  // Создать категории услуг с НДС
  const serviceCategories = await Promise.all([
    prisma.serviceCategory.upsert({
      where: { name: 'Образовательные услуги' },
      update: { defaultVatRate: 0 },
      create: {
        name: 'Образовательные услуги',
        description: 'Занятия для несовершеннолетних (без НДС)',
        icon: 'book',
        color: '#4CAF50',
        defaultVatRate: 0,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { name: 'Услуги для взрослых' },
      update: { defaultVatRate: 20 },
      create: {
        name: 'Услуги для взрослых',
        description: 'Занятия для совершеннолетних (НДС 20% включен в цену)',
        icon: 'user',
        color: '#2196F3',
        defaultVatRate: 20,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { name: 'Аренда помещений' },
      update: { defaultVatRate: 20 },
      create: {
        name: 'Аренда помещений',
        description: 'Почасовая аренда залов (НДС 20% включен)',
        icon: 'building',
        color: '#FF9800',
        defaultVatRate: 20,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { name: 'Прочие услуги' },
      update: { defaultVatRate: 0 },
      create: {
        name: 'Прочие услуги',
        description: 'Печать, копирование и другие услуги (без НДС)',
        icon: 'settings',
        color: '#9E9E9E',
        defaultVatRate: 0,
      },
    }),
  ]);

  console.log(`✅ Created ${serviceCategories.length} service categories`);

  // Создать услуги
  const services = await Promise.all([
    // Абонементы
    prisma.service.create({
      data: {
        name: 'Абонемент "Безлимит" на танцы (младшая группа)',
        description: 'Неограниченное посещение занятий в течение месяца',
        categoryId: serviceCategories[0].id,
        serviceType: 'SUBSCRIPTION',
        basePrice: 4000,
        vatRate: 0, // Образовательные услуги без НДС
        priceWithVat: 4000,
        unitOfMeasure: 'MONTH',
        writeOffTiming: 'ON_SALE',
        groupId: groups[0].id,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Абонемент "Безлимит" на вокал (средняя группа)',
        description: 'Неограниченное посещение занятий в течение месяца',
        categoryId: serviceCategories[0].id,
        serviceType: 'SUBSCRIPTION',
        basePrice: 5000,
        vatRate: 0,
        priceWithVat: 5000,
        unitOfMeasure: 'MONTH',
        writeOffTiming: 'ON_SALE',
        groupId: groups[1].id,
      },
    }),
    // Аренда
    prisma.service.create({
      data: {
        name: 'Аренда Большого зала (почасовая)',
        description: 'Аренда Большого зала на 1 час',
        categoryId: serviceCategories[1].id,
        serviceType: 'RENTAL',
        basePrice: 2000,
        vatRate: 20,
        priceWithVat: 2400,
        unitOfMeasure: 'HOUR',
        writeOffTiming: 'ON_SALE',
        roomId: rooms[0].id,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Аренда Танцевальной студии (посуточная)',
        description: 'Аренда Танцевальной студии на 1 день',
        categoryId: serviceCategories[1].id,
        serviceType: 'RENTAL',
        basePrice: 10000,
        vatRate: 20,
        priceWithVat: 12000,
        unitOfMeasure: 'DAY',
        writeOffTiming: 'ON_SALE',
        roomId: rooms[1].id,
      },
    }),
    // Разовые занятия
    prisma.service.create({
      data: {
        name: 'Разовое посещение танцев (младшая группа)',
        description: 'Одно занятие без абонемента',
        categoryId: serviceCategories[2].id,
        serviceType: 'SINGLE_SESSION',
        basePrice: 500,
        vatRate: 0,
        priceWithVat: 500,
        unitOfMeasure: 'SESSION',
        writeOffTiming: 'ON_USE',
        groupId: groups[0].id,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Разовое посещение вокала (средняя группа)',
        description: 'Одно занятие без абонемента',
        categoryId: serviceCategories[2].id,
        serviceType: 'SINGLE_SESSION',
        basePrice: 600,
        vatRate: 0,
        priceWithVat: 600,
        unitOfMeasure: 'SESSION',
        writeOffTiming: 'ON_USE',
        groupId: groups[1].id,
      },
    }),
    // Индивидуальные уроки
    prisma.service.create({
      data: {
        name: 'Индивидуальный урок хореографии',
        description: 'Персональное занятие с педагогом по хореографии',
        categoryId: serviceCategories[3].id,
        serviceType: 'INDIVIDUAL_LESSON',
        basePrice: 2000,
        vatRate: 0,
        priceWithVat: 2000,
        unitOfMeasure: 'SESSION',
        writeOffTiming: 'ON_USE',
      },
    }),
    prisma.service.create({
      data: {
        name: 'Индивидуальный урок вокала',
        description: 'Персональное занятие с педагогом по вокалу',
        categoryId: serviceCategories[3].id,
        serviceType: 'INDIVIDUAL_LESSON',
        basePrice: 2500,
        vatRate: 0,
        priceWithVat: 2500,
        unitOfMeasure: 'SESSION',
        writeOffTiming: 'ON_USE',
      },
    }),
  ]);

  console.log(`✅ Created ${services.length} services`);

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
        type: 'VISIT_PACK',
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

  // Создать реквизиты организации для QR-кодов
  const organizationDetails = await prisma.organizationDetails.upsert({
    where: { id: 'default-org' },
    update: {
      organizationName: 'Департамент финансов города Москвы (ГБУ «ОКЦ СВАО» л/с 2694143000800901)',
      inn: '7715000100',
      kpp: '771501001',
      treasuryAccount: '03224643450000017300',
      bankName: 'ГУ Банка России по ЦФО/УФК по г. Москве г. Москва',
      bic: '004525988',
      correspAcc: '40102810545370000003',
      defaultKBK: '94100000000000000131131022',
      defaultOKTMO: '45352000',
      isPrimary: true,
    },
    create: {
      id: 'default-org',
      organizationName: 'Департамент финансов города Москвы (ГБУ «ОКЦ СВАО» л/с 2694143000800901)',
      inn: '7715000100',
      kpp: '771501001',
      treasuryAccount: '03224643450000017300',
      bankName: 'ГУ Банка России по ЦФО/УФК по г. Москве г. Москва',
      bic: '004525988',
      correspAcc: '40102810545370000003',
      defaultKBK: '94100000000000000131131022',
      defaultOKTMO: '45352000',
      isPrimary: true,
    },
  });

  console.log('\n✅ Created organization details for QR payments');

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
  console.log(`   - ${benefitCategories.length} benefit categories`);
  console.log(`   - ${serviceCategories.length} service categories`);
  console.log(`   - ${services.length} services`);
  console.log(`   - ${subscriptionTypes.length} subscription types`);
  console.log(`   - Organization details for QR payments`);
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
