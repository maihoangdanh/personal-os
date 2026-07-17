import { Controller, Get, Query } from '@nestjs/common';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { ReportQueryDto } from './dto/report-query.dto';
import { FinanceReportService } from './finance-report.service';

@Controller('finance')
export class FinanceController {
  constructor(private readonly report: FinanceReportService) {}

  /** Monthly Income/Expense/Profit/SavingRate (runtime, transfers excluded). */
  @Get('report')
  monthlyReport(@CurrentUser() user: AuthUser, @Query() q: ReportQueryDto) {
    return this.report.monthlyReport(user.userId, q.month);
  }

  @Get('net-worth')
  netWorth(@CurrentUser() user: AuthUser) {
    return this.report.netWorth(user.userId);
  }
}
