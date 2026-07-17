import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CalendarModule } from './calendar/calendar.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { GoalModule } from './goal/goal.module';
import { HabitModule } from './habit/habit.module';
import { HealthController } from './health/health.controller';
import { KpiModule } from './kpi/kpi.module';
import { MilestoneModule } from './milestone/milestone.module';
import { NotificationModule } from './notification/notification.module';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';
import { VisionModule } from './vision/vision.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
  ],
  controllers: [HealthController],
  providers: [
    // Global auth: every route requires a valid token unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
