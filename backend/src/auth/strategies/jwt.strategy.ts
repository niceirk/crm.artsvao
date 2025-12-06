import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

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
    // Используем safe клиент с автоматическим retry при ошибках соединения
    // Retry логика теперь централизована в PrismaService.safe через retryExtension
    const user = await this.prisma.safe.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status === 'BLOCKED') {
      throw new UnauthorizedException('User not found or blocked');
    }

    // Update last login (fire-and-forget, некритично - не ломаем аутентификацию при сбое)
    this.prisma.safe.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch((err) => {
        this.logger.warn(`Failed to update lastLoginAt: ${err.message}`);
      });

    return {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
    };
  }
}
