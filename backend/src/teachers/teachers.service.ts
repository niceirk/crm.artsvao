import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { S3StorageService } from '../common/services/s3-storage.service';

@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);

  constructor(
    private prisma: PrismaService,
    private s3Storage: S3StorageService,
  ) {}

  async create(createTeacherDto: CreateTeacherDto) {
    return this.prisma.teacher.create({
      data: createTeacherDto,
    });
  }

  async findAll() {
    return this.prisma.teacher.findMany({
      orderBy: { lastName: 'asc' },
      include: {
        _count: {
          select: {
            groups: true,
            schedules: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            groups: true,
            schedules: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }

    return teacher;
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto) {
    await this.findOne(id); // Check if exists

    return this.prisma.teacher.update({
      where: { id },
      data: updateTeacherDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    // Check if teacher is assigned to groups or schedules
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            groups: true,
            schedules: true,
          },
        },
      },
    });

    if (teacher._count.groups > 0 || teacher._count.schedules > 0) {
      throw new BadRequestException(
        'Cannot delete teacher that is assigned to groups or schedules',
      );
    }

    return this.prisma.teacher.delete({
      where: { id },
    });
  }

  /**
   * Загрузить фото учителя в S3
   */
  async uploadPhoto(teacherId: string, file: Express.Multer.File) {
    const teacher = await this.findOne(teacherId);

    // Удаляем старое фото из S3, если оно есть
    if (teacher.photoUrl && !teacher.photoUrl.startsWith('/uploads/')) {
      try {
        const urlParts = teacher.photoUrl.split('/');
        const fileName = `teachers/${urlParts[urlParts.length - 1]}`;
        await this.s3Storage.deleteImage(fileName);
      } catch (error) {
        this.logger.warn(`Failed to delete old photo: ${error.message}`);
      }
    }

    // Загружаем новое фото в S3
    const result = await this.s3Storage.uploadImage(file, 'teachers', 800, 85);

    return this.prisma.teacher.update({
      where: { id: teacherId },
      data: { photoUrl: result.imageUrl },
    });
  }

  /**
   * Удалить фото учителя из S3
   */
  async deletePhoto(teacherId: string) {
    const teacher = await this.findOne(teacherId);

    // Удаляем фото из S3, если оно есть
    if (teacher.photoUrl && !teacher.photoUrl.startsWith('/uploads/')) {
      try {
        const urlParts = teacher.photoUrl.split('/');
        const fileName = `teachers/${urlParts[urlParts.length - 1]}`;
        await this.s3Storage.deleteImage(fileName);
      } catch (error) {
        this.logger.warn(`Failed to delete photo from S3: ${error.message}`);
      }
    }

    return this.prisma.teacher.update({
      where: { id: teacherId },
      data: { photoUrl: null },
    });
  }
}
