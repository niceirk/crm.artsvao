import { IsNumber, IsOptional, IsString, Min, IsBoolean, IsArray, ValidateIf } from 'class-validator';

export class UpdateCompensationDto {
  @IsOptional()
  @ValidateIf((o) => o.adjustedAmount !== null)
  @IsNumber()
  @Min(0)
  adjustedAmount?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  // Флаги включения компонентов перерасчёта
  @IsOptional()
  @IsBoolean()
  includeExcused?: boolean;

  @IsOptional()
  @IsBoolean()
  includeMedCert?: boolean;

  @IsOptional()
  @IsBoolean()
  includeCancelled?: boolean;

  // Исключённые счета из задолженности
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedInvoiceIds?: string[];

  // Детализация расчёта (для истории)
  @IsOptional()
  @IsNumber()
  baseAmount?: number;

  @IsOptional()
  @IsNumber()
  medCertAmount?: number;

  @IsOptional()
  @IsNumber()
  cancelledAmount?: number;

  @IsOptional()
  @IsNumber()
  debtAmount?: number;
}
