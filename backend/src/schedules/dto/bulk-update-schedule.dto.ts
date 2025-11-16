import { IsArray, IsOptional, IsUUID, ValidateNested, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleType, CalendarEventStatus } from '@prisma/client';

export class BulkUpdateScheduleDto {
  @IsArray()
  @IsUUID('4', { each: true })
  scheduleIds: string[];

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsString()
  startTime?: string; // HH:mm format

  @IsOptional()
  @IsString()
  endTime?: string; // HH:mm format

  @IsOptional()
  @IsEnum(ScheduleType)
  type?: ScheduleType;

  @IsOptional()
  @IsEnum(CalendarEventStatus)
  status?: CalendarEventStatus;
}
