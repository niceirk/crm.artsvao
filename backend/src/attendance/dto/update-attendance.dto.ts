import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto {
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
