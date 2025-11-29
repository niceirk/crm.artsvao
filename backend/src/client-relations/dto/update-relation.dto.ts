import { IsEnum } from 'class-validator';
import { RelationType } from '@prisma/client';

export class UpdateRelationDto {
  @IsEnum(RelationType)
  relationType: RelationType;
}
