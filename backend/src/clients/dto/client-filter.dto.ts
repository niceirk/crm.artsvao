import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientStatus } from '@prisma/client';

export class ClientFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  leadSource?: string;

  @IsOptional()
  @IsString()
  discount?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
