import { IsString, IsEnum, IsUUID } from 'class-validator';
import { RelationType } from '@prisma/client';

export class CreateRelationDto {
  @IsUUID()
  @IsString()
  relatedClientId: string;

  @IsEnum(RelationType)
  relationType: RelationType;
}
