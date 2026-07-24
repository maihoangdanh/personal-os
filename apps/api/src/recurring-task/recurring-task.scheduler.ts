import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from '@personal-os/database';
import { TaskRepository } from '../task/task.repository';
import { RecurringTaskRepository } from './recurring-task.repository';
import { RecurringTaskService } from './recurring-task.service';
import { vnTodayStart } from './vn-time';

/**
 * Chạy 1 lần/ngày. Server production chạy container UTC (`00:10 * * *` = 00:10 UTC =
 * 07:10 giờ VN — vẫn là "đầu giờ sáng" thật với người dùng, không cần đổi lịch cron).
 * Với mỗi template active:
 * 1) archive các Task instance quá hạn (deadline trước 00:00 giờ VN hôm nay) chưa DONE.
 * 2) sinh instance hôm nay nếu lịch khớp (tái dùng RecurringTaskService — tính theo giờ VN,
 *    xem vn-time.ts, KHÔNG theo giờ local của server).
 */
@Injectable()
export class RecurringTaskScheduler {
  private readonly logger = new Logger(RecurringTaskScheduler.name);

  constructor(
    private readonly repo: RecurringTaskRepository,
    private readonly taskRepo: TaskRepository,
    private readonly service: RecurringTaskService,
  ) {}

  @Cron('10 0 * * *') // 00:10 UTC = 07:10 VN mỗi ngày
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
    const startOfToday = vnTodayStart();

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
