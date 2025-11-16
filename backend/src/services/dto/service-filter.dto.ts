import { IsEnum, IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType } from '@prisma/client';

export class ServiceFilterDto {
  @IsUUID('4', { message: 'Некорректный ID категории' })
  @IsOptional()
  categoryId?: string;

  @IsEnum(ServiceType, { message: 'Некорректный тип услуги' })
  @IsOptional()
  serviceType?: ServiceType;

  @IsUUID('4', { message: 'Некорректный ID группы' })
  @IsOptional()
  groupId?: string;

  @IsUUID('4', { message: 'Некорректный ID помещения' })
  @IsOptional()
  roomId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 50;
}
