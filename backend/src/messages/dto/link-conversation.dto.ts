import { IsUUID } from 'class-validator';

export class LinkConversationDto {
  @IsUUID()
  clientId: string;
}
