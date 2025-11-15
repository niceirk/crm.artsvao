import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { CalendarEventStatus } from '@prisma/client';

export class CreateReservationDto {
  @IsString()
  roomId: string;

  @IsDateString()
  date: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsEnum(CalendarEventStatus)
  @IsOptional()
  status?: CalendarEventStatus;

  @IsString()
  @IsOptional()
  reservedBy?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
