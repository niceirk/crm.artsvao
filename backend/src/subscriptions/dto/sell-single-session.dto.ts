import {
  IsUUID,
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class SellSingleSessionDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  groupId: string;

  @IsUUID()
  @IsOptional()
  scheduleId?: string; // ID занятия (опционально, только при продаже из журнала)

  @IsDateString()
  @IsOptional()
  date?: string; // Дата занятия, по умолчанию - текущая

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  quantity?: number; // Количество посещений (по умолчанию 1)

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  applyBenefit?: boolean; // Применить льготу клиента
}
