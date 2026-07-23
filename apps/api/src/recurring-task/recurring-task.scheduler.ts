import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from '@personal-os/database';
import { TaskRepository } from '../task/task.repository';
import { RecurringTaskRepository } from './recurring-task.repository';
import { RecurringTaskService } from './recurring-task.service';

/**
 * Chạy 1 lần/ngày (đầu giờ sáng, giờ server — hệ thống hiện 1 user thật nên
 * không cần theo timezone riêng từng user, xem spec). Với mỗi template active:
 * 1) archive các Task instance quá hạn (deadline < hôm nay) chưa DONE.
 * 2) sinh instance hôm nay nếu lịch khớp (tái dùng RecurringTaskService).
 */
@Injectable()
export class RecurringTaskScheduler {
  private readonly logger = new Logger(RecurringTaskScheduler.name);

  constructor(
    private readonly repo: RecurringTaskRepository,
    private readonly taskRepo: TaskRepository,
    private readonly service: RecurringTaskService,
  ) {}

  @Cron('10 0 * * *') // 00:10 mỗi ngày — lệch khỏi nửa đêm đúng để tránh trùng job khác
  async run(): Promise<void> {
    const templates = await this.repo.findAllActive();
    let archived = 0;
    let generated = 0;

    for (const template of templates) {
      archived += await this.archiveOverdueInstances(template.id);
      const result = await this.service.maybeGenerateToday(template);
      if (result) generated += 1;
    }

    if (archived > 0 || generated > 0) {
      this.logger.debug(
        `Recurring task run: archived ${archived} overdue instance(s), generated ${generated} new task(s)`,
      );
    }
  }

  private async archiveOverdueInstances(templateId: string): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const stale = await prisma.task.findMany({
      where: {
        recurringTemplateId: templateId,
        status: { notIn: ['DONE', 'ARCHIVED'] },
        deadline: { lt: startOfToday },
        deletedAt: null,
      },
    });

    for (const task of stale) {
      await this.taskRepo.update(
        task.id,
        { status: 'ARCHIVED' },
        [task.projectId],
        task.milestoneId ? [task.milestoneId] : [],
      );
    }
    return stale.length;
  }
}
