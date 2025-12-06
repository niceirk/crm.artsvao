import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { EmailService } from '../email/email.service';
import { Logger } from '@nestjs/common';
import { safeTransaction } from '../prisma/prisma-transaction.helper';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string) {
    // Используем safe клиент с автоматическим retry при ошибках соединения
    const user = await this.prisma.safe.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'BLOCKED') {
      throw new UnauthorizedException('Account is blocked');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '12h', // 12 hours
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d', // 30 days
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    // Рассчитываем дату истечения refresh token
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 30);

    // Сохраняем refresh token в БД и обновляем lastLoginAt в транзакции
    // Используем safeTransaction с retry при ошибках соединения
    await safeTransaction(
      this.prisma,
      async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await tx.refreshToken.create({
          data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: refreshTokenExpiresAt,
            userAgent,
            ipAddress,
          },
        });
      },
      { maxWaitMs: 5000, timeoutMs: 10000 },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async refresh(refreshToken: string, userAgent?: string, ipAddress?: string): Promise<AuthResponseDto> {
    try {
      // Проверяем подпись JWT
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Проверяем что токен существует в БД и не отозван
      // Используем safe клиент с retry при ошибках соединения
      const storedToken = await this.prisma.safe.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Refresh token not found');
      }

      if (storedToken.revokedAt) {
        // Токен был отозван - возможна попытка использования украденного токена
        // Отзываем все токены пользователя для безопасности
        await this.prisma.safe.refreshToken.updateMany({
          where: { userId: storedToken.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        this.logger.warn(`Attempted use of revoked refresh token for user ${storedToken.userId}`);
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      if (new Date() > storedToken.expiresAt) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      const user = await this.prisma.safe.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status === 'BLOCKED') {
        throw new UnauthorizedException('User not found or blocked');
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: '12h',
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: '30d',
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Рассчитываем дату истечения нового refresh token
      const newRefreshTokenExpiresAt = new Date();
      newRefreshTokenExpiresAt.setDate(newRefreshTokenExpiresAt.getDate() + 30);

      // Ротация токенов: отзываем старый, создаём новый
      // Используем safeTransaction с retry при ошибках соединения
      await safeTransaction(
        this.prisma,
        async (tx) => {
          await tx.refreshToken.update({
            where: { id: storedToken.id },
            data: { revokedAt: new Date() },
          });
          await tx.refreshToken.create({
            data: {
              userId: user.id,
              token: newRefreshToken,
              expiresAt: newRefreshTokenExpiresAt,
              userAgent,
              ipAddress,
            },
          });
        },
        { maxWaitMs: 5000, timeoutMs: 10000 },
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatarUrl,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.safe.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async logout(userId: string) {
    // Отзываем все активные refresh токены пользователя
    await this.prisma.safe.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out successfully' };
  }

  /**
   * Создание токена восстановления пароля
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Не раскрываем информацию о существовании пользователя в системе
    if (!user) {
      return {
        message: 'Если email существует в системе, на него отправлено письмо с инструкциями',
      };
    }

    // Генерируем криптографически стойкий токен
    const token = crypto.randomBytes(32).toString('hex');

    // Токен действителен 1 час
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Создаем токен восстановления
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Отправляем email с токеном восстановления
    try {
      await this.emailService.sendPasswordReset(
        user.email,
        token,
        user.firstName || 'Пользователь',
      );
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${user.email}:`, error);
      // Не блокируем операцию - токен уже создан и можно отправить письмо вручную
    }

    return {
      message: 'Если email существует в системе, на него отправлено письмо с инструкциями',
    };
  }

  /**
   * Сброс пароля по токену
   */
  async resetPassword(dto: ResetPasswordDto) {
    // Ищем токен
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Неверный или истекший токен восстановления');
    }

    // Проверяем, не использован ли токен
    if (resetToken.usedAt) {
      throw new BadRequestException('Токен уже использован');
    }

    // Проверяем срок действия
    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Токен истек');
    }

    // Хешируем новый пароль
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    // Проверяем, является ли это приглашённым пользователем (BLOCKED и никогда не входил)
    // Если да - активируем его при установке пароля
    const shouldActivate = resetToken.user.status === 'BLOCKED' && !resetToken.user.lastLoginAt;

    // Обновляем пароль пользователя и активируем если нужно
    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        ...(shouldActivate && { status: 'ACTIVE' }),
      },
    });

    // Помечаем токен как использованный
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    return {
      message: shouldActivate
        ? 'Пароль установлен. Аккаунт активирован.'
        : 'Пароль успешно изменен',
    };
  }
}
