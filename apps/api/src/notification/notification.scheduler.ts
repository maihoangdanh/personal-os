import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from './notification.service';

/**
 * Internal reminder poller. Runs every minute and asks the service to deliver
 * any due REMINDER via Telegram (marking sentAt only on a successful send).
 * Logs only when it did work, to avoid spamming the console every idle minute.
 */
@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(private readonly notifications: NotificationService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async pollDueReminders(): Promise<void> {
    const processed = await this.notifications.dispatchDueReminders();
    if (processed > 0) {
      this.logger.debug(`Reminder poll processed ${processed} notification(s)`);
    }
  }
}
