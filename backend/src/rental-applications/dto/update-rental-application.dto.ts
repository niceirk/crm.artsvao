import { PartialType } from '@nestjs/mapped-types';
import { CreateRentalApplicationDto } from './create-rental-application.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { RentalApplicationStatus } from '@prisma/client';

export class UpdateRentalApplicationDto extends PartialType(CreateRentalApplicationDto) {
  @IsEnum(RentalApplicationStatus)
  @IsOptional()
  status?: RentalApplicationStatus;
}
