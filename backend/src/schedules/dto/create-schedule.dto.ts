import { IsString, IsEnum, IsOptional, IsBoolean, IsUUID, IsDateString } from 'class-validator';
import { ScheduleType, CalendarEventStatus } from '@prisma/client';

export class CreateScheduleDto {
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @IsUUID()
  teacherId: string;

  @IsUUID()
  roomId: string;

  @IsDateString()
  date: string;

  @IsString()
  startTime: string; // HH:mm format

  @IsString()
  endTime: string; // HH:mm format

  @IsEnum(ScheduleType)
  type: ScheduleType;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @IsOptional()
  recurrenceRule?: string;

  @IsEnum(CalendarEventStatus)
  @IsOptional()
  status?: CalendarEventStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
