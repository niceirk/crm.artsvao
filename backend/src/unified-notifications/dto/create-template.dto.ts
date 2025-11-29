import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  MinLength,
} from 'class-validator';
import { NotificationChannel } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Уникальный код шаблона' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiProperty({ enum: NotificationChannel, description: 'Канал доставки' })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ description: 'Название шаблона' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: 'Описание шаблона' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Тема письма (для email)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Тело шаблона (Handlebars)' })
  @IsString()
  @MinLength(1)
  body: string;

  @ApiPropertyOptional({ description: 'Схема переменных (JSON Schema)' })
  @IsOptional()
  @IsObject()
  variablesSchema?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Активен ли шаблон' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
