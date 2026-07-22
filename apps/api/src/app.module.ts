import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AiModule } from './ai/ai.module';
import { AssetModule } from './asset/asset.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BudgetModule } from './budget/budget.module';
import { CalendarModule } from './calendar/calendar.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { FinanceModule } from './finance/finance.module';
import { GoalModule } from './goal/goal.module';
import { HabitModule } from './habit/habit.module';
import { HealthController } from './health/health.controller';
import { InvestmentModule } from './investment/investment.module';
import { JournalModule } from './journal/journal.module';
import { KpiModule } from './kpi/kpi.module';
import { MilestoneModule } from './milestone/milestone.module';
import { NotificationModule } from './notification/notification.module';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';
import { TransactionModule } from './transaction/transaction.module';
import { VisionModule } from './vision/vision.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    AuditModule,
    AuthModule,
    TaskModule,
    HabitModule,
    NotificationModule,
    CalendarModule,
    VisionModule,
    GoalModule,
    KpiModule,
    ProjectModule,
    MilestoneModule,
    WalletModule,
    TransactionModule,
    BudgetModule,
    InvestmentModule,
    AssetModule,
    FinanceModule,
    JournalModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global rate limit (100 req/min/IP default) — runs before auth so it also
    // covers unauthenticated endpoints (login, register). Stricter per-route
    // limits via @Throttle() where brute-force risk is higher (see auth.controller).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global auth: every route requires a valid token unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
