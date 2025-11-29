import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsObject,
  IsUUID,
  IsDateString,
} from 'class-validator';
import {
  NotificationChannel,
  NotificationEventType,
  NotificationInitiator,
} from '@prisma/client';

export class CreateNotificationDto {
  @ApiPropertyOptional({ description: 'ID клиента-получателя' })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiProperty({ enum: NotificationChannel, description: 'Канал доставки' })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ description: 'Адрес получателя (chatId/email)' })
  @IsString()
  recipientAddress: string;

  @ApiProperty({ enum: NotificationEventType, description: 'Тип события' })
  @IsEnum(NotificationEventType)
  eventType: NotificationEventType;

  @ApiProperty({ description: 'Код шаблона' })
  @IsString()
  templateCode: string;

  @ApiPropertyOptional({ description: 'Данные для шаблона' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @ApiPropertyOptional({
    enum: NotificationInitiator,
    description: 'Инициатор уведомления',
  })
  @IsOptional()
  @IsEnum(NotificationInitiator)
  initiator?: NotificationInitiator;

  @ApiPropertyOptional({ description: 'ID инициатора (admin id)' })
  @IsOptional()
  @IsString()
  initiatorId?: string;

  @ApiPropertyOptional({ description: 'Время отложенной отправки' })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}
