import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ClientStatus } from '@prisma/client';

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
