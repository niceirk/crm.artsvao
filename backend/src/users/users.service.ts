import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  UserResponseDto,
  UsersFilterDto,
  CreateInviteDto,
  UpdateUserStatusDto,
} from './dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Найти пользователя по ID
   */
  async findById(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
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
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  /**
   * Обновить профиль пользователя
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    // Проверяем существование пользователя
    await this.findById(userId);

    // Обновляем данные
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
      },
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
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Сменить пароль пользователя
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    // Получаем пользователя с хешем пароля
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        'У пользователя не установлен пароль',
      );
    }

    // Проверяем текущий пароль
    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный текущий пароль');
    }

    // Хешируем новый пароль
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    // Обновляем пароль
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return { message: 'Пароль успешно изменен' };
  }

  /**
   * Загрузить аватар пользователя
   */
  async uploadAvatar(
    userId: string,
    filename: string,
  ): Promise<UserResponseDto> {
    const avatarUrl = `/uploads/avatars/${filename}`;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
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
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Удалить аватар пользователя
   */
  async deleteAvatar(userId: string): Promise<UserResponseDto> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
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
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Получить список всех пользователей с фильтрами и пагинацией (только для админов)
   */
  async findAll(filters: UsersFilterDto) {
    const { role, status, search, page = 1, limit = 20 } = filters;

    // Построение условий фильтрации
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Получение общего количества пользователей
    const total = await this.prisma.user.count({ where });

    // Получение пользователей с пагинацией
    const users = await this.prisma.user.findMany({
      where,
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
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Создать приглашение для нового пользователя (только для админов)
   */
  async createInvite(dto: CreateInviteDto) {
    // Проверяем, не существует ли уже пользователь с таким email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Генерируем токен приглашения
    const inviteToken = randomBytes(32).toString('hex');

    // Создаем пользователя со статусом BLOCKED и без пароля
    // Пользователь будет активирован после установки пароля по invite token
    const defaultPassword = randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        status: 'BLOCKED', // Будет активирован после установки пароля
        passwordHash, // Временный пароль
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // TODO: Отправить email с invite token и ссылкой для установки пароля
    // Пока возвращаем токен в ответе
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/set-password?token=${inviteToken}`;

    return {
      user: newUser,
      inviteLink,
      inviteToken,
      message: 'Приглашение создано. Отправьте ссылку пользователю.',
    };
  }

  /**
   * Обновить статус пользователя (только для админов)
   */
  async updateStatus(userId: string, dto: UpdateUserStatusDto) {
    // Проверяем существование пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Обновляем статус
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
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
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Удалить пользователя (только для админов)
   */
  async remove(userId: string, currentUserId: string) {
    // Проверяем, что не удаляем сами себя
    if (userId === currentUserId) {
      throw new BadRequestException('Вы не можете удалить сами себя');
    }

    // Проверяем существование пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Удаляем пользователя
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Пользователь успешно удален' };
  }
}
