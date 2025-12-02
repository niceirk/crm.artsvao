import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @IsString()
  @IsOptional()
  rentalId?: string;

  @IsString()
  @IsOptional()
  rentalApplicationId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
