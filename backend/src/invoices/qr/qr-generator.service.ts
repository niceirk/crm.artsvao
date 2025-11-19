import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

export interface QRCodeOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  width?: number;
  margin?: number;
}

/**
 * Сервис для генерации QR-кодов
 * Использует библиотеку qrcode для создания QR-кодов в различных форматах
 */
@Injectable()
export class QRGeneratorService {
  private readonly logger = new Logger(QRGeneratorService.name);

  /**
   * Генерация QR-кода как Buffer (PNG)
   * @param data - строка данных для кодирования
   * @param options - опции генерации (уровень коррекции, размер, отступы)
   * @returns Promise с Buffer содержащим PNG изображение
   */
  async generateBuffer(
    data: string,
    options?: QRCodeOptions,
  ): Promise<Buffer> {
    try {
      const buffer = await QRCode.toBuffer(data, {
        errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
        width: options?.width || 300,
        margin: options?.margin || 4,
        type: 'png',
      });

      this.logger.debug(
        `QR code buffer generated, size: ${buffer.length} bytes`,
      );
      return buffer;
    } catch (error) {
      this.logger.error('Failed to generate QR code buffer:', error);
      throw new Error(`Не удалось сгенерировать QR-код: ${error.message}`);
    }
  }

  /**
   * Генерация QR-кода как Data URL
   * Data URL можно встраивать напрямую в HTML: <img src="data:image/png;base64,..." />
   * @param data - строка данных для кодирования
   * @param options - опции генерации
   * @returns Promise с Data URL строкой
   */
  async generateDataURL(
    data: string,
    options?: QRCodeOptions,
  ): Promise<string> {
    try {
      const dataUrl = await QRCode.toDataURL(data, {
        errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
        width: options?.width || 300,
        margin: options?.margin || 4,
        type: 'image/png',
      });

      this.logger.debug('QR code data URL generated');
      return dataUrl;
    } catch (error) {
      this.logger.error('Failed to generate QR code data URL:', error);
      throw new Error(`Не удалось сгенерировать QR-код: ${error.message}`);
    }
  }

  /**
   * Генерация QR-кода как SVG
   * SVG формат масштабируется без потери качества
   * @param data - строка данных для кодирования
   * @param options - опции генерации
   * @returns Promise с SVG строкой
   */
  async generateSVG(data: string, options?: QRCodeOptions): Promise<string> {
    try {
      const svg = await QRCode.toString(data, {
        type: 'svg',
        errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
        width: options?.width || 300,
        margin: options?.margin || 4,
      });

      this.logger.debug('QR code SVG generated');
      return svg;
    } catch (error) {
      this.logger.error('Failed to generate QR code SVG:', error);
      throw new Error(`Не удалось сгенерировать QR-код: ${error.message}`);
    }
  }

  /**
   * Генерация QR-кода одновременно в нескольких форматах
   * Удобно когда нужны и Buffer и Data URL
   * @param data - строка данных для кодирования
   * @param options - опции генерации
   * @returns Promise с объектом содержащим buffer и dataUrl
   */
  async generateBoth(
    data: string,
    options?: QRCodeOptions,
  ): Promise<{ buffer: Buffer; dataUrl: string }> {
    try {
      const [buffer, dataUrl] = await Promise.all([
        this.generateBuffer(data, options),
        this.generateDataURL(data, options),
      ]);

      return { buffer, dataUrl };
    } catch (error) {
      this.logger.error('Failed to generate QR code in multiple formats:', error);
      throw new Error(`Не удалось сгенерировать QR-код: ${error.message}`);
    }
  }
}
