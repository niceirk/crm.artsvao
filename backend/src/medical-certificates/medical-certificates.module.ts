import { Module } from '@nestjs/common';
import { MedicalCertificatesController } from './medical-certificates.controller';
import { MedicalCertificatesService } from './medical-certificates.service';
import { PrismaModule } from '../prisma/prisma.module';
import { S3StorageService } from '../common/services/s3-storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [MedicalCertificatesController],
  providers: [MedicalCertificatesService, S3StorageService],
  exports: [MedicalCertificatesService],
})
export class MedicalCertificatesModule {}
