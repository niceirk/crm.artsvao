import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from './users-filter.dto';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus, { message: 'Недопустимый статус' })
  @IsNotEmpty({ message: 'Статус обязателен' })
  status: UserStatus;
}
