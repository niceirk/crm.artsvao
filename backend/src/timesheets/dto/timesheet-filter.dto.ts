import { IsOptional, IsString, IsUUID } from 'class-validator';

export class TimesheetFilterDto {
  @IsOptional()
  @IsUUID()
  studioId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsString()
  month?: string; // Формат: "2025-11"
}
