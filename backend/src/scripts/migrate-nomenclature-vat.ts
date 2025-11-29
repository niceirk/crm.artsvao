/**
 * Скрипт миграции данных для номенклатуры с НДС
 * Запуск: npx tsx src/scripts/migrate-nomenclature-vat.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Начало миграции данных номенклатуры с НДС...\n');

  // 1. Создать/обновить категории услуг с НДС
  console.log('📁 Обновление категорий услуг...');

  const categories = [
    {
      name: 'Образовательные услуги',
      description: 'Занятия для несовершеннолетних (без НДС)',
      icon: 'book',
      color: '#4CAF50',
      defaultVatRate: 0,
    },
    {
      name: 'Услуги для взрослых',
      description: 'Занятия для совершеннолетних (НДС 20% включен в цену)',
      icon: 'user',
      color: '#2196F3',
      defaultVatRate: 20,
    },
    {
      name: 'Аренда помещений',
      description: 'Почасовая аренда залов (НДС 20% включен)',
      icon: 'building',
      color: '#FF9800',
      defaultVatRate: 20,
    },
    {
      name: 'Прочие услуги',
      description: 'Печать, копирование и другие услуги (без НДС)',
      icon: 'settings',
      color: '#9E9E9E',
      defaultVatRate: 0,
    },
  ];

  const createdCategories: { [key: string]: string } = {};

  for (const cat of categories) {
    const result = await prisma.serviceCategory.upsert({
      where: { name: cat.name },
      update: { defaultVatRate: cat.defaultVatRate },
      create: cat,
    });
    createdCategories[cat.name] = result.id;
    console.log(`   ✓ ${cat.name} (НДС: ${cat.defaultVatRate}%)`);
  }

  // 2. Привязать группы к категориям на основе возраста
  console.log('\n📎 Привязка групп к категориям...');

  const groups = await prisma.group.findMany({
    where: { serviceCategoryId: null },
    select: { id: true, name: true, ageMin: true, ageMax: true },
  });

  let educationCount = 0;
  let adultCount = 0;

  for (const group of groups) {
    // Если ageMax < 18 или ageMin < 18 и ageMax не указан - образовательные
    // Если ageMin >= 18 - для взрослых
    const isForAdults = group.ageMin !== null && group.ageMin >= 18;
    const categoryName = isForAdults ? 'Услуги для взрослых' : 'Образовательные услуги';
    const categoryId = createdCategories[categoryName];

    await prisma.group.update({
      where: { id: group.id },
      data: { serviceCategoryId: categoryId },
    });

    if (isForAdults) {
      adultCount++;
    } else {
      educationCount++;
    }
    console.log(`   ✓ ${group.name} → ${categoryName}`);
  }

  console.log(`\n   Образовательные: ${educationCount}, Для взрослых: ${adultCount}`);

  // 3. Статистика
  console.log('\n📊 Итоги миграции:');

  const categoriesCount = await prisma.serviceCategory.count();
  const groupsWithCategory = await prisma.group.count({
    where: { serviceCategoryId: { not: null } },
  });
  const totalGroups = await prisma.group.count();

  console.log(`   Категорий услуг: ${categoriesCount}`);
  console.log(`   Групп с категорией: ${groupsWithCategory}/${totalGroups}`);

  console.log('\n✅ Миграция завершена успешно!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка миграции:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
