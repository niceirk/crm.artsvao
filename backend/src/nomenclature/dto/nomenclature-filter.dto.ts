import { IsOptional, IsString, IsEnum, IsUUID, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export enum NomenclatureItemType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  SINGLE_SESSION = 'SINGLE_SESSION',
  VISIT_PACK = 'VISIT_PACK',
  INDEPENDENT_SERVICE = 'INDEPENDENT_SERVICE',
}

export class NomenclatureFilterDto {
  @IsOptional()
  @IsEnum(NomenclatureItemType)
  type?: NomenclatureItemType;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
