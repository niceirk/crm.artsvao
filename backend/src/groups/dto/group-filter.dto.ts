import { IsString, IsEnum, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { GroupStatus } from '@prisma/client';

export class GroupFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  studioId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsEnum(GroupStatus)
  status?: GroupStatus;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPaid?: boolean;

  @IsOptional()
  @IsEnum(['child', 'teen', 'adult', 'all'])
  ageRange?: 'child' | 'teen' | 'adult' | 'all';

  // Сортировка
  @IsOptional()
  @IsEnum(['name', 'createdAt', 'ageMin', 'maxParticipants'])
  sortBy?: 'name' | 'createdAt' | 'ageMin' | 'maxParticipants';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  // Пагинация
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
