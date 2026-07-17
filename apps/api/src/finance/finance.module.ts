import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceReportRepository } from './finance-report.repository';
import { FinanceReportService } from './finance-report.service';

@Module({
  controllers: [FinanceController],
  providers: [FinanceReportService, FinanceReportRepository],
  exports: [FinanceReportService],
})
export class FinanceModule {}
