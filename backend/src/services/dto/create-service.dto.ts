import { IsString, IsNumber, IsEnum, IsUUID, IsOptional, IsBoolean, Min, Max, MinLength } from 'class-validator';
import { ServiceType, UnitOfMeasure, WriteOffTiming } from '@prisma/client';

export class CreateServiceDto {
  @IsString()
  @MinLength(1, { message: 'Название не может быть пустым' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID('4', { message: 'Некорректный ID категории' })
  categoryId: string;

  @IsEnum(ServiceType, { message: 'Некорректный тип услуги' })
  serviceType: ServiceType;

  @IsNumber({}, { message: 'Базовая цена должна быть числом' })
  @Min(0, { message: 'Базовая цена не может быть отрицательной' })
  basePrice: number;

  @IsNumber({}, { message: 'Ставка НДС должна быть числом' })
  @Min(0, { message: 'Ставка НДС не может быть отрицательной' })
  @Max(100, { message: 'Ставка НДС не может превышать 100%' })
  @IsOptional()
  vatRate?: number;

  @IsEnum(UnitOfMeasure, { message: 'Некорректная единица измерения' })
  unitOfMeasure: UnitOfMeasure;

  @IsEnum(WriteOffTiming, { message: 'Некорректная модель списания' })
  writeOffTiming: WriteOffTiming;

  @IsUUID('4', { message: 'Некорректный ID группы' })
  @IsOptional()
  groupId?: string;

  @IsUUID('4', { message: 'Некорректный ID помещения' })
  @IsOptional()
  roomId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
