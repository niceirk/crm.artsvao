import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';
import { IsOptional, IsEnum, IsInt } from 'class-validator';
import { ClientStatus } from '@prisma/client';

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @IsInt()
  @IsOptional()
  version?: number; // Для защиты от перезатирания

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
