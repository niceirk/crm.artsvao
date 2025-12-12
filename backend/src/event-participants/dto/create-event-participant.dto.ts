import { IsUUID, IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { EventRegistrationSource } from '@prisma/client';

export class CreateEventParticipantDto {
  @IsUUID()
  eventId: string;

  @IsUUID()
  clientId: string;

  @IsEnum(EventRegistrationSource)
  source: EventRegistrationSource;

  @IsNumber()
  @IsOptional()
  telegramChatId?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
