import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TimesheetFilterDto } from './dto/timesheet-filter.dto';

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filter: TimesheetFilterDto;
  progress?: number;
  result?: Buffer;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class ExportJobService {
  private readonly logger = new Logger(ExportJobService.name);
  private readonly jobs = new Map<string, ExportJob>();
  private readonly JOB_TTL_MS = 30 * 60 * 1000; // 30 минут
  private readonly MAX_JOBS = 100;

  constructor() {
    // Периодическая очистка старых задач
    setInterval(() => this.cleanupOldJobs(), 5 * 60 * 1000);
  }

  /**
   * Создать задачу на экспорт
   */
  createJob(filter: TimesheetFilterDto): ExportJob {
    // Проверяем лимит задач
    if (this.jobs.size >= this.MAX_JOBS) {
      this.cleanupOldJobs();
      if (this.jobs.size >= this.MAX_JOBS) {
        throw new Error('Слишком много задач экспорта. Попробуйте позже.');
      }
    }

    const job: ExportJob = {
      id: this.generateJobId(),
      status: 'pending',
      filter,
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    this.logger.log(`Export job created: ${job.id}`);

    return job;
  }

  /**
   * Получить задачу по ID
   */
  getJob(id: string): ExportJob {
    const job = this.jobs.get(id);
    if (!job) {
      throw new NotFoundException(`Задача экспорта ${id} не найдена`);
    }
    return job;
  }

  /**
   * Обновить статус задачи
   */
  updateJobStatus(
    id: string,
    status: ExportJob['status'],
    data?: { result?: Buffer; error?: string; progress?: number },
  ): void {
    const job = this.getJob(id);
    job.status = status;

    if (data?.result) {
      job.result = data.result;
    }
    if (data?.error) {
      job.error = data.error;
    }
    if (data?.progress !== undefined) {
      job.progress = data.progress;
    }
    if (status === 'completed' || status === 'failed') {
      job.completedAt = new Date();
    }

    this.logger.log(`Export job ${id} status: ${status}`);
  }

  /**
   * Удалить результат задачи (после скачивания)
   */
  clearJobResult(id: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.result = undefined;
    }
  }

  /**
   * Очистка старых задач
   */
  private cleanupOldJobs(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, job] of this.jobs.entries()) {
      const jobAge = now - job.createdAt.getTime();
      if (jobAge > this.JOB_TTL_MS) {
        this.jobs.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} old export jobs`);
    }
  }

  /**
   * Генерация уникального ID задачи
   */
  private generateJobId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
