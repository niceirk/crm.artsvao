import { IsUUID, IsString, IsOptional, IsDateString } from 'class-validator';

export class SellSingleSessionDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  groupId: string;

  @IsUUID()
  scheduleId: string; // ID занятия для которого продаётся разовое посещение

  @IsDateString()
  @IsOptional()
  date?: string; // Дата занятия, по умолчанию - текущая

  @IsString()
  @IsOptional()
  notes?: string;
}
