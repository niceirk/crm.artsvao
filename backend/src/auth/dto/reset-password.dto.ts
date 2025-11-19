import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Токен должен быть строкой' })
  @IsNotEmpty({ message: 'Токен обязателен' })
  token: string;

  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  newPassword: string;
}
