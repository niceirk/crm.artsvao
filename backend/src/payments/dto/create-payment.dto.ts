import {
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  IsDateString,
} from 'class-validator';
import { PaymentMethod, PaymentType } from '@prisma/client';

export class CreatePaymentDto {
  @IsUUID()
  clientId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsUUID()
  @IsOptional()
  invoiceId?: string;

  @IsUUID()
  @IsOptional()
  subscriptionId?: string;

  @IsUUID()
  @IsOptional()
  rentalId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsDateString()
  @IsOptional()
  paidAt?: string;
}
