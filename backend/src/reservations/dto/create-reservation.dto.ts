import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ReservationStatus } from '@prisma/client';

export class CreateReservationDto {
  @IsString()
  roomId: string;

  @IsDateString()
  date: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
