import { IsUUID, IsEnum, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceFilterDto {
  @IsUUID()
  @IsOptional()
  scheduleId?: string;

  @IsUUID()
  @IsOptional()
  groupId?: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  limit?: number = 50;
}
