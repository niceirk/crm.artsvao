import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddMemberDto {
  @IsNotEmpty()
  @IsUUID()
  clientId: string;
}
