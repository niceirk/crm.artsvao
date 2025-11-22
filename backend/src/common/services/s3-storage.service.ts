import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { randomBytes } from 'crypto';
import { extname } from 'path';

export interface UploadImageResult {
  imageUrl: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  mimeType: string;
}

@Injectable()
export class S3StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly logger = new Logger(S3StorageService.name);

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    this.region = this.configService.get<string>('AWS_S3_REGION');

    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
      ...(endpoint && { endpoint }), // Для совместимых хранилищ (например, DigitalOcean Spaces, MinIO)
    });

    if (!this.bucketName || !this.region) {
      this.logger.warn('S3 credentials not configured. File upload will fail.');
    }
  }

  /**
   * Загрузка изображения в S3 с автоматическим сжатием
   * @param file Express.Multer.File
   * @param folder Папка в S3 bucket (например, 'messages', 'avatars')
   * @param maxWidth Максимальная ширина изображения (по умолчанию 2048px)
   * @param quality Качество JPEG (по умолчанию 80)
   * @returns Информация о загруженном файле
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'images',
    maxWidth: number = 2048,
    quality: number = 80,
  ): Promise<UploadImageResult> {
    try {
      // Генерация уникального имени файла
      const uniqueSuffix = randomBytes(16).toString('hex');
      const ext = extname(file.originalname).toLowerCase();
      const fileName = `${folder}/${Date.now()}-${uniqueSuffix}${ext}`;

      // Обработка изображения через sharp
      let imageBuffer = file.buffer;
      let metadata = await sharp(file.buffer).metadata();

      // Сжатие и изменение размера если нужно
      if (metadata.width > maxWidth) {
        const processed = sharp(file.buffer)
          .resize(maxWidth, null, { withoutEnlargement: true })
          .jpeg({ quality, progressive: true });

        imageBuffer = await processed.toBuffer();
        metadata = await sharp(imageBuffer).metadata();
      } else if (file.mimetype === 'image/jpeg') {
        // Оптимизация JPEG без изменения размера
        const processed = sharp(file.buffer).jpeg({ quality, progressive: true });
        imageBuffer = await processed.toBuffer();
      }

      // Параметры загрузки в S3
      const uploadParams: PutObjectCommandInput = {
        Bucket: this.bucketName,
        Key: fileName,
        Body: imageBuffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Публичный доступ к файлу
        CacheControl: 'max-age=31536000', // Кеширование на 1 год
      };

      // Загрузка в S3
      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      // Формирование публичного URL
      const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
      const imageUrl = endpoint
        ? `${endpoint}/${this.bucketName}/${fileName}`
        : `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;

      this.logger.log(`Image uploaded successfully: ${imageUrl}`);

      return {
        imageUrl,
        fileName,
        fileSize: imageBuffer.length,
        width: metadata.width,
        height: metadata.height,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload image to S3: ${error.message}`, error.stack);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Удаление файла из S3
   * @param fileName Имя файла в S3 (с путем, например 'messages/123456.jpg')
   */
  async deleteImage(fileName: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(command);
      this.logger.log(`Image deleted successfully: ${fileName}`);
    } catch (error) {
      this.logger.error(`Failed to delete image from S3: ${error.message}`, error.stack);
      throw new Error(`Image deletion failed: ${error.message}`);
    }
  }

  /**
   * Получение публичного URL для файла
   * @param fileName Имя файла в S3
   */
  getPublicUrl(fileName: string): string {
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
    return endpoint
      ? `${endpoint}/${this.bucketName}/${fileName}`
      : `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
  }
}
