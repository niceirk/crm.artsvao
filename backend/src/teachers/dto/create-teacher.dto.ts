import { IsString, IsEmail, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { TeacherStatus } from '@prisma/client';

export class CreateTeacherDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  salaryPercentage: number;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsEnum(TeacherStatus)
  @IsOptional()
  status?: TeacherStatus;
}
