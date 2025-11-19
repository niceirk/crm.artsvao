import { IsEmail, IsNotEmpty, IsString, IsEnum, MinLength } from 'class-validator';
import { UserRole } from './users-filter.dto';

export class CreateInviteDto {
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @IsString({ message: 'Имя должно быть строкой' })
  @IsNotEmpty({ message: 'Имя обязательно' })
  @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })
  firstName: string;

  @IsString({ message: 'Фамилия должна быть строкой' })
  @IsNotEmpty({ message: 'Фамилия обязательна' })
  @MinLength(2, { message: 'Фамилия должна содержать минимум 2 символа' })
  lastName: string;

  @IsEnum(UserRole, { message: 'Недопустимая роль' })
  role: UserRole;
}
