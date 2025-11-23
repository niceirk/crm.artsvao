import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class CreateAttendanceDto {
  @IsUUID()
  scheduleId: string;

  @IsUUID()
  clientId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsUUID()
  @IsOptional()
  subscriptionId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
