import { IsString, IsInt, IsEnum, IsOptional, IsNumber, IsUUID, Min } from 'class-validator';
import { GroupStatus } from '@prisma/client';

export class CreateGroupDto {
  @IsUUID()
  studioId: string;

  @IsString()
  name: string;

  @IsUUID()
  teacherId: string;

  @IsUUID()
  @IsOptional()
  roomId?: string;

  @IsInt()
  @Min(1)
  maxParticipants: number;

  @IsNumber()
  @Min(0)
  singleSessionPrice: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  ageMin?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  ageMax?: number;

  @IsEnum(GroupStatus)
  @IsOptional()
  status?: GroupStatus;
}
