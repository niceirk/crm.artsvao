import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function getUserProfilePhoto(userId: bigint): Promise<string | null> {
  try {
    console.log(`Получение аватара для пользователя ${userId}...`);

    const apiClient = axios.create({
      baseURL: `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`,
      timeout: 10000,
    });

    const response = await apiClient.get('/getUserProfilePhotos', {
      params: { user_id: userId.toString(), limit: 1 },
    });

    console.log(`  📊 Ответ API:`, JSON.stringify(response.data, null, 2));

    if (!response.data.result?.photos || response.data.result.photos.length === 0) {
      console.log(`  ❌ Нет фото для пользователя ${userId}`);
      return null;
    }

    const photo = response.data.result.photos[0];
    const fileId = photo[photo.length - 1].file_id;

    const fileResponse = await apiClient.get('/getFile', {
      params: { file_id: fileId },
    });

    const filePath = fileResponse.data.result.file_path;
    const photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

    console.log(`  ✅ Получен URL: ${photoUrl.substring(0, 60)}...`);
    return photoUrl;
  } catch (error: any) {
    console.error(`  ❌ Ошибка для ${userId}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🔄 Обновление аватаров для всех Telegram аккаунтов...\n');

  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN не установлен!');
    process.exit(1);
  }
  console.log(`✅ Токен бота: ${TELEGRAM_BOT_TOKEN.substring(0, 10)}...${TELEGRAM_BOT_TOKEN.substring(TELEGRAM_BOT_TOKEN.length - 5)}\n`);

  const accounts = await prisma.telegramAccount.findMany({
    select: {
      id: true,
      telegramUserId: true,
      firstName: true,
      username: true,
      photoUrl: true,
    },
  });

  console.log(`Найдено аккаунтов: ${accounts.length}\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const account of accounts) {
    console.log(`\n[${updated + skipped + failed + 1}/${accounts.length}] ${account.firstName} (@${account.username || 'no username'})`);

    if (account.photoUrl) {
      console.log('  ⏭️  Уже есть аватар, пропускаем');
      skipped++;
      continue;
    }

    const photoUrl = await getUserProfilePhoto(account.telegramUserId);

    if (photoUrl) {
      await prisma.telegramAccount.update({
        where: { id: account.id },
        data: { photoUrl },
      });
      console.log('  💾 Сохранено в базу');
      updated++;
    } else {
      failed++;
    }

    // Небольшая задержка чтобы не перегрузить API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n\n✅ Готово!`);
  console.log(`   Обновлено: ${updated}`);
  console.log(`   Пропущено (уже были): ${skipped}`);
  console.log(`   Не удалось: ${failed}`);

  await prisma.$disconnect();
}

main().catch(console.error);
