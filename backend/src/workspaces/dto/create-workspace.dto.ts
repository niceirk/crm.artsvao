import {
  IsString,
  IsUUID,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { WorkspaceStatus } from '@prisma/client';

export class CreateWorkspaceDto {
  @IsUUID()
  roomId: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  number?: string;

  @IsNumber()
  @Min(0)
  dailyRate: number;

  @IsNumber()
  @Min(0)
  monthlyRate: number;

  @IsEnum(WorkspaceStatus)
  @IsOptional()
  status?: WorkspaceStatus;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  amenities?: string;
}
