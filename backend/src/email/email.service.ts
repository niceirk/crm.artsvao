import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import { PasswordResetEmail } from './templates/PasswordResetEmail';
import { UserInviteEmail } from './templates/UserInviteEmail';
import { EventNotificationEmail } from './templates/EventNotificationEmail';
import { InvoiceQRCodeEmail } from './templates/InvoiceQRCodeEmail';
import { PrismaService } from '../prisma/prisma.service';
import * as React from 'react';

interface EventData {
  title?: string;
  eventTitle?: string;
  date?: string;
  eventDate?: string;
  location?: string;
  organizer?: string;
  capacity?: number;
  description?: string;
  changes?: string[];
  eventUrl: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Отправка email для восстановления пароля
   */
  async sendPasswordReset(
    email: string,
    token: string,
    firstName?: string,
  ): Promise<void> {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
      const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

      const html = await render(
        React.createElement(PasswordResetEmail, {
          firstName,
          resetUrl,
        }),
      );

      await this.mailerService.sendMail({
        to: email,
        subject: 'Восстановление пароля - артсвао',
        html,
      });

      this.logger.log(`Password reset email sent to ${email}`);
      await this.logEmailSend(email, 'Восстановление пароля - артсвао', 'password-reset', 'SENT');
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      await this.logEmailSend(
        email,
        'Восстановление пароля - артсвао',
        'password-reset',
        'FAILED',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Отправка приглашения новому пользователю
   */
  async sendUserInvite(
    email: string,
    token: string,
    inviterName: string,
    userRole: string,
    firstName?: string,
    lastName?: string,
  ): Promise<void> {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
      const inviteUrl = `${frontendUrl}/auth/set-password?token=${token}`;

      const html = await render(
        React.createElement(UserInviteEmail, {
          firstName,
          lastName,
          email,
          role: userRole,
          inviterName,
          inviteUrl,
        }),
      );

      await this.mailerService.sendMail({
        to: email,
        subject: 'Приглашение в систему артсвао',
        html,
      });

      this.logger.log(`User invite email sent to ${email}`);
      await this.logEmailSend(email, 'Приглашение в систему артсвао', 'user-invite', 'SENT');
    } catch (error) {
      this.logger.error(`Failed to send user invite email to ${email}:`, error);
      await this.logEmailSend(
        email,
        'Приглашение в систему артсвао',
        'user-invite',
        'FAILED',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Отправка уведомления о новом событии
   */
  async sendEventNotification(
    email: string,
    eventData: EventData,
    notificationType: 'new' | 'update' | 'cancel' = 'new',
  ): Promise<void> {
    try {
      const html = await render(
        React.createElement(EventNotificationEmail, {
          notificationType,
          eventTitle: eventData.eventTitle || eventData.title || '',
          eventDate: eventData.eventDate || eventData.date || '',
          location: eventData.location,
          organizer: eventData.organizer,
          capacity: eventData.capacity,
          description: eventData.description,
          changes: eventData.changes,
          eventUrl: eventData.eventUrl,
        }),
      );

      const title = eventData.eventTitle || eventData.title || 'Событие';
      const subjects = {
        new: `Новое мероприятие: ${title}`,
        update: `Изменение в мероприятии: ${title}`,
        cancel: `Отмена мероприятия: ${title}`,
      };

      await this.mailerService.sendMail({
        to: email,
        subject: subjects[notificationType],
        html,
      });

      this.logger.log(`Event notification (${notificationType}) sent to ${email}`);
      await this.logEmailSend(email, subjects[notificationType], 'event-notification', 'SENT');
    } catch (error) {
      this.logger.error(`Failed to send event notification to ${email}:`, error);
      const title = eventData.eventTitle || eventData.title || 'Событие';
      const subjects = {
        new: `Новое мероприятие: ${title}`,
        update: `Изменение в мероприятии: ${title}`,
        cancel: `Отмена мероприятия: ${title}`,
      };
      await this.logEmailSend(
        email,
        subjects[notificationType],
        'event-notification',
        'FAILED',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Отправка массовых уведомлений о событии
   */
  async sendEventNotificationBulk(
    emails: string[],
    eventData: EventData,
    notificationType: 'new' | 'update' | 'cancel' = 'new',
  ): Promise<{ success: number; failed: number }> {
    const results = {
      success: 0,
      failed: 0,
    };

    for (const email of emails) {
      try {
        await this.sendEventNotification(email, eventData, notificationType);
        results.success++;
      } catch (error) {
        results.failed++;
        this.logger.error(`Failed to send bulk notification to ${email}:`, error);
      }
    }

    this.logger.log(
      `Bulk event notification completed: ${results.success} sent, ${results.failed} failed`,
    );

    return results;
  }

  /**
   * Отправка QR-кода для оплаты счета
   */
  async sendInvoiceQRCode(
    email: string,
    clientName: string,
    invoiceNumber: string,
    amount: number,
    qrCodeDataUrl: string,
    paymentPurpose?: string,
    discountAmount?: number,
    discountPercent?: number,
  ): Promise<void> {
    try {
      const html = await render(
        React.createElement(InvoiceQRCodeEmail, {
          clientName,
          invoiceNumber,
          amount,
          qrCodeDataUrl,
          paymentPurpose,
          discountAmount,
          discountPercent,
        }),
      );

      await this.mailerService.sendMail({
        to: email,
        subject: `QR-код для оплаты счета ${invoiceNumber}`,
        html,
      });

      this.logger.log(`Invoice QR code email sent to ${email} for invoice ${invoiceNumber}`);
      await this.logEmailSend(
        email,
        `QR-код для оплаты счета ${invoiceNumber}`,
        'invoice-qr-code',
        'SENT',
      );
    } catch (error) {
      this.logger.error(`Failed to send invoice QR code email to ${email}:`, error);
      await this.logEmailSend(
        email,
        `QR-код для оплаты счета ${invoiceNumber}`,
        'invoice-qr-code',
        'FAILED',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Логирование отправки email в БД
   */
  private async logEmailSend(
    recipient: string,
    subject: string,
    templateType: string,
    status: 'SENT' | 'FAILED',
    error?: string,
  ): Promise<void> {
    try {
      await this.prisma.emailLog.create({
        data: {
          recipient,
          subject,
          templateType,
          status,
          error,
          sentAt: status === 'SENT' ? new Date() : null,
        },
      });
    } catch (logError) {
      // Не блокируем основную операцию, если логирование не удалось
      this.logger.error(`Failed to log email send:`, logError);
    }
  }
}
