import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationEventType,
} from '@prisma/client';

export class NotificationQueryDto {
  @ApiPropertyOptional({ description: 'Номер страницы' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Количество на страницу' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: NotificationStatus, description: 'Статус' })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ enum: NotificationChannel, description: 'Канал' })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({ enum: NotificationEventType, description: 'Тип события' })
  @IsOptional()
  @IsEnum(NotificationEventType)
  eventType?: NotificationEventType;

  @ApiPropertyOptional({ description: 'ID клиента' })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiPropertyOptional({ description: 'Дата от' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Дата до' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Поиск по адресу получателя' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class TemplateQueryDto {
  @ApiPropertyOptional({ enum: NotificationChannel, description: 'Канал' })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({ description: 'Только активные' })
  @IsOptional()
  isActive?: boolean;
}
