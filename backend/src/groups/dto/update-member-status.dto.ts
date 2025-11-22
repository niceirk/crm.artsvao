import { IsEnum, IsNotEmpty } from 'class-validator';
import { GroupMemberStatus } from '@prisma/client';

export class UpdateMemberStatusDto {
  @IsNotEmpty()
  @IsEnum(GroupMemberStatus)
  status: GroupMemberStatus;
}
