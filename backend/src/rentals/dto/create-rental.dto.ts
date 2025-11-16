import { IsString, IsEmail, IsEnum, IsOptional, IsNumber, IsUUID, IsDateString, Min } from 'class-validator';
import { CalendarEventStatus } from '@prisma/client';

export class CreateRentalDto {
  @IsUUID()
  roomId: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsString()
  clientName: string;

  @IsString()
  @IsOptional()
  clientPhone?: string;

  @IsEmail()
  @IsOptional()
  clientEmail?: string;

  @IsString()
  @IsOptional()
  eventType?: string;

  @IsDateString()
  date: string;

  @IsString()
  startTime: string; // HH:mm format

  @IsString()
  endTime: string; // HH:mm format

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalPrice?: number;

  @IsEnum(CalendarEventStatus)
  @IsOptional()
  status?: CalendarEventStatus;

  @IsUUID()
  @IsOptional()
  managerId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
