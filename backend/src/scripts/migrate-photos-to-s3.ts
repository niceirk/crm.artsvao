/**
 * Скрипт миграции фото из локального хранилища в S3
 *
 * Запуск: npx tsx src/scripts/migrate-photos-to-s3.ts
 *
 * Мигрирует:
 * - User.avatarUrl
 * - Client.photoUrl
 * - Teacher.photoUrl
 * - Studio.photoUrl
 * - Event.photoUrl
 */

import { PrismaClient } from '@prisma/client';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { randomBytes } from 'crypto';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const prisma = new PrismaClient();

// S3 конфигурация
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  ...(process.env.AWS_S3_ENDPOINT && { endpoint: process.env.AWS_S3_ENDPOINT }),
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

interface MigrationStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

/**
 * Загрузка файла в S3
 */
async function uploadToS3(
  localPath: string,
  folder: string,
  maxWidth: number = 800,
  quality: number = 85
): Promise<string | null> {
  try {
    // Проверяем существование файла
    if (!fs.existsSync(localPath)) {
      console.log(`  File not found: ${localPath}`);
      return null;
    }

    // Читаем файл
    const fileBuffer = fs.readFileSync(localPath);
    const ext = path.extname(localPath).toLowerCase();

    // Генерируем уникальное имя
    const uniqueSuffix = randomBytes(16).toString('hex');
    const fileName = `${folder}/${Date.now()}-${uniqueSuffix}${ext}`;

    // Обрабатываем изображение через sharp
    let processedBuffer: Buffer = fileBuffer;
    let mimeType = 'image/jpeg';

    try {
      const metadata = await sharp(fileBuffer).metadata();

      // Сжимаем если нужно
      if (metadata.width && metadata.width > maxWidth) {
        processedBuffer = Buffer.from(
          await sharp(fileBuffer)
            .resize(maxWidth, null, { withoutEnlargement: true })
            .jpeg({ quality, progressive: true })
            .toBuffer()
        );
      } else if (ext === '.jpg' || ext === '.jpeg') {
        processedBuffer = Buffer.from(
          await sharp(fileBuffer)
            .jpeg({ quality, progressive: true })
            .toBuffer()
        );
      }

      // Определяем MIME тип
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.webp') mimeType = 'image/webp';
    } catch (sharpError) {
      console.log(`  Warning: Could not process image with sharp, uploading as-is`);
    }

    // Загружаем в S3
    const uploadParams: PutObjectCommandInput = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: processedBuffer,
      ContentType: mimeType,
      ACL: 'public-read',
      CacheControl: 'max-age=31536000',
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Формируем URL
    const endpoint = process.env.AWS_S3_ENDPOINT;
    const imageUrl = endpoint
      ? `${endpoint}/${BUCKET_NAME}/${fileName}`
      : `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${fileName}`;

    return imageUrl;
  } catch (error) {
    console.error(`  Error uploading to S3:`, error);
    return null;
  }
}

/**
 * Миграция аватаров пользователей
 */
async function migrateUserAvatars(): Promise<MigrationStats> {
  console.log('\n=== Миграция аватаров пользователей ===');

  const stats: MigrationStats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const users = await prisma.user.findMany({
    where: {
      avatarUrl: {
        startsWith: '/uploads/',
      },
    },
    select: {
      id: true,
      email: true,
      avatarUrl: true,
    },
  });

  stats.total = users.length;
  console.log(`Найдено ${users.length} пользователей с локальными аватарами`);

  for (const user of users) {
    console.log(`\nОбработка: ${user.email}`);

    const localPath = path.join(process.cwd(), user.avatarUrl!);
    const s3Url = await uploadToS3(localPath, 'avatars', 512, 85);

    if (s3Url) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: s3Url },
      });
      console.log(`  ✓ Мигрирован: ${s3Url}`);
      stats.success++;
    } else {
      console.log(`  ✗ Не удалось мигрировать`);
      stats.failed++;
      stats.errors.push(`User ${user.email}: файл не найден или ошибка загрузки`);
    }
  }

  return stats;
}

/**
 * Миграция фото клиентов
 */
async function migrateClientPhotos(): Promise<MigrationStats> {
  console.log('\n=== Миграция фото клиентов ===');

  const stats: MigrationStats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const clients = await prisma.client.findMany({
    where: {
      photoUrl: {
        startsWith: '/uploads/',
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
    },
  });

  stats.total = clients.length;
  console.log(`Найдено ${clients.length} клиентов с локальными фото`);

  for (const client of clients) {
    console.log(`\nОбработка: ${client.firstName} ${client.lastName}`);

    const localPath = path.join(process.cwd(), client.photoUrl!);
    const s3Url = await uploadToS3(localPath, 'clients', 800, 85);

    if (s3Url) {
      await prisma.client.update({
        where: { id: client.id },
        data: { photoUrl: s3Url },
      });
      console.log(`  ✓ Мигрирован: ${s3Url}`);
      stats.success++;
    } else {
      console.log(`  ✗ Не удалось мигрировать`);
      stats.failed++;
      stats.errors.push(`Client ${client.firstName} ${client.lastName}: файл не найден или ошибка загрузки`);
    }
  }

  return stats;
}

/**
 * Миграция фото учителей
 */
async function migrateTeacherPhotos(): Promise<MigrationStats> {
  console.log('\n=== Миграция фото учителей ===');

  const stats: MigrationStats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const teachers = await prisma.teacher.findMany({
    where: {
      photoUrl: {
        startsWith: '/uploads/',
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
    },
  });

  stats.total = teachers.length;
  console.log(`Найдено ${teachers.length} учителей с локальными фото`);

  for (const teacher of teachers) {
    console.log(`\nОбработка: ${teacher.firstName} ${teacher.lastName}`);

    const localPath = path.join(process.cwd(), teacher.photoUrl!);
    const s3Url = await uploadToS3(localPath, 'teachers', 800, 85);

    if (s3Url) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { photoUrl: s3Url },
      });
      console.log(`  ✓ Мигрирован: ${s3Url}`);
      stats.success++;
    } else {
      console.log(`  ✗ Не удалось мигрировать`);
      stats.failed++;
      stats.errors.push(`Teacher ${teacher.firstName} ${teacher.lastName}: файл не найден или ошибка загрузки`);
    }
  }

  return stats;
}

/**
 * Миграция фото студий
 */
async function migrateStudioPhotos(): Promise<MigrationStats> {
  console.log('\n=== Миграция фото студий ===');

  const stats: MigrationStats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const studios = await prisma.studio.findMany({
    where: {
      photoUrl: {
        startsWith: '/uploads/',
      },
    },
    select: {
      id: true,
      name: true,
      photoUrl: true,
    },
  });

  stats.total = studios.length;
  console.log(`Найдено ${studios.length} студий с локальными фото`);

  for (const studio of studios) {
    console.log(`\nОбработка: ${studio.name}`);

    const localPath = path.join(process.cwd(), studio.photoUrl!);
    const s3Url = await uploadToS3(localPath, 'studios', 1200, 85);

    if (s3Url) {
      await prisma.studio.update({
        where: { id: studio.id },
        data: { photoUrl: s3Url },
      });
      console.log(`  ✓ Мигрирован: ${s3Url}`);
      stats.success++;
    } else {
      console.log(`  ✗ Не удалось мигрировать`);
      stats.failed++;
      stats.errors.push(`Studio ${studio.name}: файл не найден или ошибка загрузки`);
    }
  }

  return stats;
}

/**
 * Миграция фото событий
 */
async function migrateEventPhotos(): Promise<MigrationStats> {
  console.log('\n=== Миграция фото событий ===');

  const stats: MigrationStats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const events = await prisma.event.findMany({
    where: {
      photoUrl: {
        startsWith: '/uploads/',
      },
    },
    select: {
      id: true,
      name: true,
      photoUrl: true,
    },
  });

  stats.total = events.length;
  console.log(`Найдено ${events.length} событий с локальными фото`);

  for (const event of events) {
    console.log(`\nОбработка: ${event.name}`);

    const localPath = path.join(process.cwd(), event.photoUrl!);
    const s3Url = await uploadToS3(localPath, 'events', 1200, 85);

    if (s3Url) {
      await prisma.event.update({
        where: { id: event.id },
        data: { photoUrl: s3Url },
      });
      console.log(`  ✓ Мигрирован: ${s3Url}`);
      stats.success++;
    } else {
      console.log(`  ✗ Не удалось мигрировать`);
      stats.failed++;
      stats.errors.push(`Event ${event.name}: файл не найден или ошибка загрузки`);
    }
  }

  return stats;
}

/**
 * Главная функция миграции
 */
async function main() {
  console.log('========================================');
  console.log('   МИГРАЦИЯ ФОТО В S3');
  console.log('========================================');
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Region: ${process.env.AWS_S3_REGION}`);
  console.log(`Endpoint: ${process.env.AWS_S3_ENDPOINT || 'AWS S3'}`);

  if (!BUCKET_NAME || !process.env.AWS_S3_REGION) {
    console.error('\n❌ Ошибка: Не настроены переменные окружения S3');
    console.error('Требуются: AWS_S3_BUCKET_NAME, AWS_S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
    process.exit(1);
  }

  const allStats: Record<string, MigrationStats> = {};

  try {
    // Миграция всех типов фото
    allStats.users = await migrateUserAvatars();
    allStats.clients = await migrateClientPhotos();
    allStats.teachers = await migrateTeacherPhotos();
    allStats.studios = await migrateStudioPhotos();
    allStats.events = await migrateEventPhotos();

    // Итоговая статистика
    console.log('\n========================================');
    console.log('   ИТОГОВАЯ СТАТИСТИКА');
    console.log('========================================');

    let totalSuccess = 0;
    let totalFailed = 0;
    let totalRecords = 0;

    for (const [entity, stats] of Object.entries(allStats)) {
      console.log(`\n${entity}:`);
      console.log(`  Всего: ${stats.total}`);
      console.log(`  Успешно: ${stats.success}`);
      console.log(`  Ошибок: ${stats.failed}`);

      totalRecords += stats.total;
      totalSuccess += stats.success;
      totalFailed += stats.failed;

      if (stats.errors.length > 0) {
        console.log(`  Ошибки:`);
        stats.errors.forEach((err) => console.log(`    - ${err}`));
      }
    }

    console.log('\n----------------------------------------');
    console.log(`ВСЕГО: ${totalRecords} записей`);
    console.log(`Успешно мигрировано: ${totalSuccess}`);
    console.log(`Ошибок: ${totalFailed}`);
    console.log('========================================\n');

    if (totalFailed === 0 && totalSuccess > 0) {
      console.log('✅ Миграция завершена успешно!');
    } else if (totalFailed > 0) {
      console.log('⚠️ Миграция завершена с ошибками.');
    } else {
      console.log('ℹ️ Нет записей для миграции.');
    }
  } catch (error) {
    console.error('\n❌ Критическая ошибка миграции:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
