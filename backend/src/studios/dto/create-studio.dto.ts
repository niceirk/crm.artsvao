import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { StudioType, StudioStatus } from '@prisma/client';

export class CreateStudioDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(StudioType)
  type: StudioType;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsEnum(StudioStatus)
  @IsOptional()
  status?: StudioStatus;
}
