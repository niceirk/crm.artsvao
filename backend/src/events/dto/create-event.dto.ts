import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsNumber,
  Min,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { EventStatus } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

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

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

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
}
