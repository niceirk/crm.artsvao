import { IsOptional, IsEnum, IsInt, Min, IsString, IsUUID, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ConversationStatus, MessageSource } from '@prisma/client';

export class GetConversationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @IsOptional()
  @IsEnum(MessageSource)
  source?: MessageSource;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasUnread?: boolean;
}
