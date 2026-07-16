import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { SnoozeNotificationDto } from './dto/snooze-notification.dto';
import { NotificationRepository } from './notification.repository';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly repo: NotificationRepository,
    private readonly audit: AuditService,
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
   * Internal cron step (see NotificationScheduler). Marks every due reminder
   * (scheduledFor <= now, not yet sent) as sent. Does NOT send Telegram/email —
   * "sent" here means "surfaced in the in-app list/badge" (Telegram deferred,
   * per BACKLOG.md). Returns how many rows were marked. Kept as a plain method
   * so it is unit-testable without the scheduler.
   */
  async dispatchDueReminders(now: Date = new Date()): Promise<number> {
    const due = await this.repo.findDue(now);
    if (due.length === 0) {
      return 0;
    }
    await this.repo.markManySent(
      due.map((d) => d.id),
      now,
    );
    this.logger.log(`Marked ${due.length} due reminder(s) as sent`);
    return due.length;
  }

  private async assertExists(id: string, userId: string) {
    const n = await this.repo.findByIdScoped(id, userId);
    if (!n) {
      throw new NotFoundException('Notification not found');
    }
    return n;
  }
}
