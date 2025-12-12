import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Скрипт миграции для обновления поля eventFormat в существующих событиях
 *
 * Получает поле 67 "Формат для виджета" из Pyrus API для всех событий,
 * импортированных из Pyrus (имеющих externalId)
 *
 * Использование:
 *   cd /home/nikita/artsvao/backend
 *   npx ts-node src/scripts/migrate-event-formats.ts
 */

async function migrateEventFormats() {
  console.log('🚀 Запуск миграции eventFormat из Pyrus...\n');

  // Проверяем наличие токена Pyrus
  const pyrusToken = process.env.PYRUS_API_TOKEN;
  if (!pyrusToken) {
    console.error('❌ ОШИБКА: Не найден PYRUS_API_TOKEN в переменных окружения');
    console.error('Добавьте токен в файл .env:');
    console.error('PYRUS_API_TOKEN=your_token_here');
    process.exit(1);
  }

  // Находим все события с externalId (импортированные из Pyrus)
  const events = await prisma.event.findMany({
    where: {
      externalId: { not: null },
      // Обновляем только те, где eventFormat пуст или null
      OR: [
        { eventFormat: null },
        { eventFormat: '' },
      ],
    },
    select: {
      id: true,
      externalId: true,
      name: true,
      eventFormat: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`📊 Найдено событий для обновления: ${events.length}\n`);

  if (events.length === 0) {
    console.log('✅ Нет событий для обновления');
    console.log('Все события уже имеют заполненное поле eventFormat или не импортированы из Pyrus\n');
    return;
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: Array<{ id: string; externalId: string; error: string }> = [];

  console.log('Начинаем обработку событий...\n');

  for (const event of events) {
    try {
      console.log(`[${updated + skipped + errors + 1}/${events.length}] Обработка события:`);
      console.log(`  ID: ${event.id}`);
      console.log(`  Pyrus ID: ${event.externalId}`);
      console.log(`  Название: ${event.name}`);

      // Получаем задачу из Pyrus API
      const response = await axios.get(
        `https://api.pyrus.com/v4/tasks/${event.externalId}`,
        {
          headers: {
            Authorization: `Bearer ${pyrusToken}`,
          },
          timeout: 10000, // 10 секунд таймаут
        }
      );

      const task = response.data.task;

      if (!task || !task.fields) {
        console.log(`  ⏭️  Пропущено: задача не найдена или не содержит полей\n`);
        skipped++;
        continue;
      }

      // Ищем поле 67 "Формат для виджета"
      const field67 = task.fields.find((f: any) => f.id === 67);

      if (!field67 || !field67.value) {
        console.log(`  ⏭️  Пропущено: поле 67 не заполнено в Pyrus\n`);
        skipped++;
        continue;
      }

      let eventFormat: string | null = null;

      // Обработка catalog поля (структура: { values: ["Концерт", ...] })
      if (typeof field67.value === 'object' && field67.value.values) {
        const values = field67.value.values as string[];
        eventFormat = values[0] || null;
      }
      // Обработка текстового поля
      else if (typeof field67.value === 'string') {
        eventFormat = field67.value;
      }

      if (eventFormat) {
        // Обновляем событие в БД
        await prisma.event.update({
          where: { id: event.id },
          data: { eventFormat },
        });
        console.log(`  ✅ Обновлено: eventFormat="${eventFormat}"\n`);
        updated++;
      } else {
        console.log(`  ⏭️  Пропущено: не удалось извлечь значение из поля 67\n`);
        skipped++;
      }

      // Задержка для избежания rate limit (1 запрос в секунду)
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      if (error.response) {
        // HTTP ошибка от Pyrus API
        const status = error.response.status;
        const message = error.response.data?.error_message || error.message;

        console.error(`  ❌ Ошибка API (${status}): ${message}\n`);

        errorDetails.push({
          id: event.id,
          externalId: event.externalId!,
          error: `HTTP ${status}: ${message}`,
        });
      } else if (error.code === 'ECONNABORTED') {
        console.error(`  ❌ Таймаут: не удалось получить ответ от Pyrus API\n`);
        errorDetails.push({
          id: event.id,
          externalId: event.externalId!,
          error: 'Timeout',
        });
      } else {
        console.error(`  ❌ Ошибка: ${error.message}\n`);
        errorDetails.push({
          id: event.id,
          externalId: event.externalId!,
          error: error.message,
        });
      }
      errors++;

      // Продолжаем обработку следующих событий
    }
  }

  // Итоговая статистика
  console.log('\n' + '='.repeat(60));
  console.log('📈 РЕЗУЛЬТАТЫ МИГРАЦИИ:');
  console.log('='.repeat(60));
  console.log(`  ✅ Обновлено успешно: ${updated}`);
  console.log(`  ⏭️  Пропущено: ${skipped}`);
  console.log(`  ❌ Ошибок: ${errors}`);
  console.log('='.repeat(60) + '\n');

  // Детали ошибок
  if (errorDetails.length > 0) {
    console.log('⚠️  ДЕТАЛИ ОШИБОК:\n');
    errorDetails.forEach((detail, index) => {
      console.log(`${index + 1}. Событие ID: ${detail.id}`);
      console.log(`   Pyrus ID: ${detail.externalId}`);
      console.log(`   Ошибка: ${detail.error}\n`);
    });
  }

  // Рекомендации
  if (errors > 0) {
    console.log('💡 РЕКОМЕНДАЦИИ:');
    console.log('  - Проверьте, что PYRUS_API_TOKEN актуален');
    console.log('  - Убедитесь, что события существуют в Pyrus');
    console.log('  - При rate limit ошибках увеличьте задержку между запросами\n');
  }
}

// Запуск миграции
migrateEventFormats()
  .catch((error) => {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('👋 Миграция завершена. Prisma отключен.');
  });
