import { Module } from '@nestjs/common';
import { KpiController } from './kpi.controller';
import { KpiRepository } from './kpi.repository';
import { KpiService } from './kpi.service';

@Module({
  controllers: [KpiController],
  providers: [KpiService, KpiRepository],
  exports: [KpiService],
})
export class KpiModule {}
