import { IsString, IsEmail, IsEnum, IsOptional, IsNumber, IsUUID, IsDateString, Min } from 'class-validator';
import { RentalStatus } from '@prisma/client';

export class CreateRentalDto {
  @IsUUID()
  roomId: string;

  @IsString()
  clientName: string;

  @IsString()
  clientPhone: string;

  @IsEmail()
  @IsOptional()
  clientEmail?: string;

  @IsString()
  eventType: string;

  @IsDateString()
  date: string;

  @IsString()
  startTime: string; // HH:mm format

  @IsString()
  endTime: string; // HH:mm format

  @IsNumber()
  @Min(0)
  totalPrice: number;

  @IsEnum(RentalStatus)
  @IsOptional()
  status?: RentalStatus;

  @IsUUID()
  @IsOptional()
  managerId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
