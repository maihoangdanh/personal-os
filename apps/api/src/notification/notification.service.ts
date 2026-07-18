import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { SnoozeNotificationDto } from './dto/snooze-notification.dto';
import { NotificationRepository } from './notification.repository';
import { TelegramClient } from './telegram-client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly repo: NotificationRepository,
    private readonly audit: AuditService,
    private readonly telegram: TelegramClient,
  ) {}

  async create(
    userId: string,
    dto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const notification = await this.repo.create({
      userId,
      type: dto.type ?? NotificationType.REMINDER,
      title: dto.title,
      message: dto.message ?? null,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
      relatedEntityType: dto.relatedEntityType ?? null,
      relatedEntityId: dto.relatedEntityId ?? null,
    });
    await this.audit.record({
      userId,
      action: 'notification.create',
      entityType: 'Notification',
      entityId: notification.id,
    });
    return NotificationResponseDto.from(notification);
  }

  async list(
    userId: string,
    query: QueryNotificationDto,
  ): Promise<NotificationResponseDto[]> {
    const items = await this.repo.findManyScoped(userId, {
      isRead: query.isRead,
      type: query.type,
    });
    return items.map(NotificationResponseDto.from);
  }

  async get(userId: string, id: string): Promise<NotificationResponseDto> {
    const n = await this.assertExists(id, userId);
    return NotificationResponseDto.from(n);
  }

  async remove(
    userId: string,
    id: string,
  ): Promise<{ id: string; deleted: true }> {
    await this.assertExists(id, userId);
    await this.repo.softDelete(id);
    await this.audit.record({
      userId,
      action: 'notification.delete',
      entityType: 'Notification',
      entityId: id,
    });
    return { id, deleted: true };
  }

  /** Mark as read. Idempotent: re-reading an already-read item is a no-op success. */
  async markRead(userId: string, id: string): Promise<NotificationResponseDto> {
    const existing = await this.assertExists(id, userId);
    if (existing.isRead) {
      return NotificationResponseDto.from(existing);
    }
    const n = await this.repo.update(id, { isRead: true, readAt: new Date() });
    await this.audit.record({
      userId,
      action: 'notification.read',
      entityType: 'Notification',
      entityId: id,
    });
    return NotificationResponseDto.from(n);
  }

  /**
   * Snooze: re-arm the reminder. snoozedUntil is stored, scheduledFor is moved to
   * the snooze time and sentAt/isRead cleared so the cron delivers it again.
   */
  async snooze(
    userId: string,
    id: string,
    dto: SnoozeNotificationDto,
  ): Promise<NotificationResponseDto> {
    await this.assertExists(id, userId);
    const until = new Date(dto.snoozedUntil);
    const n = await this.repo.update(id, {
      snoozedUntil: until,
      scheduledFor: until,
      sentAt: null,
      isRead: false,
      readAt: null,
    });
    await this.audit.record({
      userId,
      action: 'notification.snooze',
      entityType: 'Notification',
      entityId: id,
      metadata: { snoozedUntil: until.toISOString() },
    });
    return NotificationResponseDto.from(n);
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.repo.countUnread(userId);
    return { count };
  }

  /**
   * Internal cron step (see NotificationScheduler). For each due REMINDER
   * (scheduledFor <= now, not yet sent) it delivers a real Telegram message,
   * then marks `sentAt` ONLY on success — a failed send is left un-sent so the
   * next cron tick retries (never fake "sent"). Each reminder is isolated in its
   * own try/catch so one failure can't abort the batch. Returns how many were
   * actually delivered. Plain method so it is unit-testable without the scheduler.
   */
  async dispatchDueReminders(now: Date = new Date()): Promise<number> {
    const due = await this.repo.findDue(now);
    if (due.length === 0) {
      return 0;
    }

    let delivered = 0;
    for (const reminder of due) {
      try {
        const text = reminder.message
          ? `${reminder.title}\n${reminder.message}`
          : reminder.title;
        const sent = await this.telegram.sendMessage(text);
        if (!sent) {
          // Not configured — leave un-sent so it delivers once configured.
          continue;
        }
        await this.repo.markSent(reminder.id, now);
        delivered += 1;
      } catch (err) {
        this.logger.error(
          `Failed to deliver reminder ${reminder.id}: ${(err as Error).message}`,
        );
        // Do NOT mark sent — retry on the next tick.
      }
    }

    if (delivered > 0) {
      this.logger.log(
        `Delivered ${delivered}/${due.length} due reminder(s) via Telegram`,
      );
    }
    return delivered;
  }

  private async assertExists(id: string, userId: string) {
    const n = await this.repo.findByIdScoped(id, userId);
    if (!n) {
      throw new NotFoundException('Notification not found');
    }
    return n;
  }
}
