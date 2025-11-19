import { IsString, IsEmail, IsOptional, IsDateString, IsPhoneNumber, IsEnum, Matches } from 'class-validator';
import { ClientType, Gender, ClientStatus } from '@prisma/client';

export class CreateClientDto {
  @IsOptional()
  @IsEnum(ClientType)
  clientType?: ClientType;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  inn?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsPhoneNumber()
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
  benefitCategoryId?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  discount?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}\s?\d{6}$/, {
    message: 'Passport number must be in format: XXXX XXXXXX (4 digits series, 6 digits number)',
  })
  passportNumber?: string;

  @IsOptional()
  @IsString()
  birthCertificate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{3}-?\d{3}-?\d{3}\s?\d{2}$/, {
    message: 'SNILS must be in format: XXX-XXX-XXX XX (11 digits)',
  })
  snils?: string;

  @IsOptional()
  @IsPhoneNumber()
  phoneAdditional?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
