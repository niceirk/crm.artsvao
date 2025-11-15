import { IsString, IsEmail, IsOptional, IsDateString, IsPhoneNumber } from 'class-validator';

export class CreateClientDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsPhoneNumber('RU')
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  leadSourceId?: string;

  @IsOptional()
  @IsString()
  discount?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
