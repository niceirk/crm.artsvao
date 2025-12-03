import { IsString, IsInt, IsEnum, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';
import { RoomType } from '@prisma/client';

export class CreateRoomDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  number?: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsEnum(RoomType)
  type: RoomType;

  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyRate?: number;

  @IsString()
  @IsOptional()
  equipment?: string;

  @IsBoolean()
  @IsOptional()
  isCoworking?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyRateCoworking?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyRateCoworking?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}
