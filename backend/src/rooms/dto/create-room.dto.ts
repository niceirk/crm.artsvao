import { IsString, IsInt, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
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
}
