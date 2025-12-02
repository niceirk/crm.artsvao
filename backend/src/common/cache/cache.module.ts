import { Global, Module } from '@nestjs/common';
import { ReferenceDataCache } from './reference-data.cache';

@Global()
@Module({
  providers: [ReferenceDataCache],
  exports: [ReferenceDataCache],
})
export class CacheModule {}
