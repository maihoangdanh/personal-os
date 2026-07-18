import { Injectable } from '@nestjs/common';
import { Notification, NotificationType, Prisma, prisma } from '@personal-os/database';

export interface NotificationListFilter {
  isRead?: boolean;
  type?: NotificationType;
}

/** Only place that touches prisma for the notification domain. Filters deletedAt: null. */
@Injectable()
export class NotificationRepository {
  create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification> {
    return prisma.notification.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<Notification | null> {
    return prisma.notification.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  findManyScoped(
    userId: string,
    filter: NotificationListFilter,
  ): Promise<Notification[]> {
    const where: Prisma.NotificationWhereInput = { userId, deletedAt: null };
    if (filter.isRead !== undefined) {
      where.isRead = filter.isRead;
    }
    if (filter.type) {
      where.type = filter.type;
    }
    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  update(
    id: string,
    data: Prisma.NotificationUncheckedUpdateInput,
  ): Promise<Notification> {
    return prisma.notification.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false, deletedAt: null },
    });
  }

  // ---- Cron polling (all users) ----

  /**
   * Due REMINDER notifications not yet delivered. Only type=REMINDER is delivered
   * to Telegram (other types stay in-app only). Includes title+message for the
   * message body.
   */
  findDue(
    now: Date,
  ): Promise<{ id: string; userId: string; title: string; message: string | null }[]> {
    return prisma.notification.findMany({
      where: {
        type: NotificationType.REMINDER,
        scheduledFor: { lte: now },
        sentAt: null,
        deletedAt: null,
      },
      select: { id: true, userId: true, title: true, message: true },
    });
  }

  /** Mark a single reminder delivered — called only after a successful send. */
  markSent(id: string, sentAt: Date): Promise<Notification> {
    return prisma.notification.update({ where: { id }, data: { sentAt } });
  }
}
