import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { NotificationChannel } from '@prisma/client';

export class MassSendFiltersDto {
  @ApiPropertyOptional({ description: 'ID группы' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ description: 'ID студии' })
  @IsOptional()
  @IsString()
  studioId?: string;

  @ApiPropertyOptional({ description: 'Статус клиентов' })
  @IsOptional()
  @IsString()
  clientStatus?: string;

  @ApiPropertyOptional({ description: 'Список ID клиентов' })
  @IsOptional()
  @IsArray()
  clientIds?: string[];
}

export class MassSendDto {
  @ApiProperty({ enum: NotificationChannel, description: 'Канал доставки' })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ description: 'Код шаблона' })
  @IsString()
  templateCode: string;

  @ApiPropertyOptional({ description: 'Данные для шаблона' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @ApiProperty({ description: 'Фильтры получателей', type: MassSendFiltersDto })
  @IsObject()
  filters: MassSendFiltersDto;

  @ApiPropertyOptional({ description: 'Тестовый режим (только первые 10)' })
  @IsOptional()
  @IsBoolean()
  testMode?: boolean;
}
