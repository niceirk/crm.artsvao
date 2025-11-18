import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsNumber,
  Min,
  IsEnum,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { CalendarEventStatus } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  fullDescription?: string;

  @IsString()
  @IsOptional()
  eventTypeId?: string;

  @IsDateString()
  date: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsString()
  roomId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxCapacity?: number;

  @IsString()
  @IsOptional()
  responsibleUserId?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsEnum(CalendarEventStatus)
  @IsOptional()
  status?: CalendarEventStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  participants?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number;

  @IsString()
  @IsOptional()
  externalId?: string;

  @IsString()
  @IsOptional()
  timepadLink?: string;

  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;

  @IsBoolean()
  @IsOptional()
  isGovernmentTask?: boolean;

  @IsString()
  @IsOptional()
  eventFormat?: string;
}
