import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TaskModule } from '../task/task.module';
import { RecurringTaskController } from './recurring-task.controller';
import { RecurringTaskRepository } from './recurring-task.repository';
import { RecurringTaskScheduler } from './recurring-task.scheduler';
import { RecurringTaskService } from './recurring-task.service';

@Module({
  imports: [TaskModule, AuditModule],
  controllers: [RecurringTaskController],
  providers: [RecurringTaskService, RecurringTaskRepository, RecurringTaskScheduler],
})
export class RecurringTaskModule {}
