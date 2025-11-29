import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { RenderedContent } from './interfaces/channel.interface';
import { NotificationTemplateV2 } from '@prisma/client';

@Injectable()
export class NotificationRendererService {
  private readonly logger = new Logger(NotificationRendererService.name);
  private readonly compiledTemplates = new Map<string, HandlebarsTemplateDelegate>();

  constructor() {
    this.registerHelpers();
  }

  /**
   * Регистрация вспомогательных функций Handlebars
   */
  private registerHelpers(): void {
    // Форматирование даты
    Handlebars.registerHelper('formatDate', (date: string | Date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    });

    // Форматирование времени
    Handlebars.registerHelper('formatTime', (time: string | Date) => {
      if (!time) return '';
      const d = new Date(time);
      return d.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    // Форматирование денег
    Handlebars.registerHelper('formatMoney', (amount: number | string) => {
      if (amount === null || amount === undefined) return '';
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(num);
    });

    // Форматирование числа
    Handlebars.registerHelper('formatNumber', (num: number | string) => {
      if (num === null || num === undefined) return '';
      const n = typeof num === 'string' ? parseFloat(num) : num;
      return new Intl.NumberFormat('ru-RU').format(n);
    });

    // Условия
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
    Handlebars.registerHelper('gte', (a: number, b: number) => a >= b);
    Handlebars.registerHelper('lte', (a: number, b: number) => a <= b);

    // Логические операции
    Handlebars.registerHelper('and', (...args: any[]) => {
      const options = args.pop();
      return args.every(Boolean);
    });

    Handlebars.registerHelper('or', (...args: any[]) => {
      const options = args.pop();
      return args.some(Boolean);
    });

    // Pluralize для русского языка (занятий/занятия/занятие)
    Handlebars.registerHelper(
      'pluralize',
      (count: number, one: string, few: string, many: string) => {
        const n = Math.abs(count) % 100;
        const n1 = n % 10;
        if (n > 10 && n < 20) return many;
        if (n1 > 1 && n1 < 5) return few;
        if (n1 === 1) return one;
        return many;
      },
    );

    // Склонение слова "занятие"
    Handlebars.registerHelper('pluralizeVisits', (count: number) => {
      const n = Math.abs(count) % 100;
      const n1 = n % 10;
      if (n > 10 && n < 20) return 'занятий';
      if (n1 > 1 && n1 < 5) return 'занятия';
      if (n1 === 1) return 'занятие';
      return 'занятий';
    });
  }

  /**
   * Рендеринг шаблона с данными
   */
  async render(
    template: NotificationTemplateV2 | null,
    payload: Record<string, any>,
  ): Promise<RenderedContent> {
    if (!template) {
      this.logger.warn('Template not found, returning empty content');
      return {
        body: '',
        format: 'text',
      };
    }

    try {
      // Получаем или компилируем шаблон тела
      const bodyTemplate = this.getCompiledTemplate(template.id, template.body);
      const body = bodyTemplate(payload);

      // Рендерим тему (для email)
      let subject: string | undefined;
      if (template.subject) {
        const subjectTemplate = this.getCompiledTemplate(
          `${template.id}_subject`,
          template.subject,
        );
        subject = subjectTemplate(payload);
      }

      // Определяем формат (Telegram - markdown/text, Email - html)
      const format = template.channel === 'EMAIL' ? 'html' : 'text';

      return {
        subject,
        body,
        format,
      };
    } catch (error) {
      this.logger.error(
        `Failed to render template ${template.id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Предпросмотр шаблона с тестовыми данными
   */
  async preview(
    templateBody: string,
    templateSubject: string | null,
    payload: Record<string, any>,
    channel: string,
  ): Promise<RenderedContent> {
    try {
      const bodyTemplate = Handlebars.compile(templateBody);
      const body = bodyTemplate(payload);

      let subject: string | undefined;
      if (templateSubject) {
        const subjectTemplate = Handlebars.compile(templateSubject);
        subject = subjectTemplate(payload);
      }

      const format = channel === 'EMAIL' ? 'html' : 'text';

      return {
        subject,
        body,
        format,
      };
    } catch (error) {
      this.logger.error(`Failed to preview template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получение скомпилированного шаблона из кеша или компиляция нового
   */
  private getCompiledTemplate(
    cacheKey: string,
    templateText: string,
  ): HandlebarsTemplateDelegate {
    if (!this.compiledTemplates.has(cacheKey)) {
      const compiled = Handlebars.compile(templateText);
      this.compiledTemplates.set(cacheKey, compiled);
    }
    return this.compiledTemplates.get(cacheKey)!;
  }

  /**
   * Очистка кеша шаблонов (при обновлении шаблона)
   */
  clearCache(templateId?: string): void {
    if (templateId) {
      this.compiledTemplates.delete(templateId);
      this.compiledTemplates.delete(`${templateId}_subject`);
    } else {
      this.compiledTemplates.clear();
    }
  }

  /**
   * Извлечение переменных из шаблона
   */
  extractVariables(templateText: string): string[] {
    const regex = /\{\{([^#/}]+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(templateText)) !== null) {
      const variable = match[1].trim();
      // Игнорируем хелперы и вложенные пути
      if (!variable.includes(' ') && !variable.startsWith('this.')) {
        variables.add(variable.split('.')[0]);
      }
    }

    return Array.from(variables);
  }
}
