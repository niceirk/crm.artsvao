import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

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
}
