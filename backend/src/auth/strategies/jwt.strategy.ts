import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => {
          // Поддерживаем токен в query (?token=) для SSE EventSource
          return req?.query?.token as string | undefined;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Запрос пользователя с retry логикой для устойчивости к временным сбоям БД
    const user = await this.findUserWithRetry(payload.sub);

    if (!user || user.status === 'BLOCKED') {
      throw new UnauthorizedException('User not found or blocked');
    }

    // Update last login (некритично - не ломаем аутентификацию при сбое)
    this.updateLastLogin(user.id).catch((err) => {
      this.logger.warn(`Failed to update lastLoginAt: ${err.message}`);
    });

    return {
      sub: user.id, // Добавлено для совместимости с контроллерами
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
    };
  }

  /**
   * Поиск пользователя с retry логикой при ошибках соединения
   */
  private async findUserWithRetry(userId: string, attempt = 0): Promise<any> {
    try {
      return await this.prisma.user.findUnique({
        where: { id: userId },
      });
    } catch (error) {
      const isConnectionError = this.isConnectionError(error);

      if (isConnectionError && attempt < MAX_RETRIES) {
        this.logger.warn(
          `JWT validate: DB connection error, retrying (${attempt + 1}/${MAX_RETRIES})`,
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));

        // Попробовать reconnect
        try {
          await this.prisma.handleDeadConnection();
        } catch {
          /* игнорируем ошибку reconnect */
        }

        return this.findUserWithRetry(userId, attempt + 1);
      }

      this.logger.error(`JWT validate failed: ${(error as Error).message}`);
      throw new UnauthorizedException(
        'Authentication service temporarily unavailable',
      );
    }
  }

  /**
   * Обновление времени последнего входа (fire-and-forget)
   */
  private async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Проверяет, является ли ошибка временной ошибкой соединения
   */
  private isConnectionError(error: unknown): boolean {
    const message = (error as Error)?.message || '';
    return (
      message.includes('P1017') ||
      message.includes('P1001') ||
      message.includes('P1002') ||
      message.includes('P1008') ||
      message.includes('connection') ||
      message.includes('ECONNRESET') ||
      message.includes('EPIPE') ||
      message.includes('57P05') ||
      message.includes('08006') ||
      message.includes('08003') ||
      message.includes('Server has closed')
    );
  }
}
