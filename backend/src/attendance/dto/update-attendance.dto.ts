import { IsEnum, IsUUID, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto {
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @IsUUID()
  @IsOptional()
  subscriptionId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
