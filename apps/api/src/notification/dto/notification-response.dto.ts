import { Notification, NotificationType } from '@personal-os/database';

/** Exact shape returned for a Notification. Copy this when building the frontend type. */
export class NotificationResponseDto {
  id!: string;
  userId!: string;
  type!: NotificationType; // "REMINDER" | "DEADLINE" | "SYSTEM" | "ACHIEVEMENT"
  title!: string;
  message!: string | null;
  isRead!: boolean;
  readAt!: string | null; // ISO-8601
  scheduledFor!: string | null; // ISO-8601 — when the reminder should fire
  sentAt!: string | null; // ISO-8601 — set by the cron once delivered (null = pending)
  snoozedUntil!: string | null; // ISO-8601
  relatedEntityType!: string | null;
  relatedEntityId!: string | null;
  createdAt!: string; // ISO-8601
  updatedAt!: string; // ISO-8601

  static from(n: Notification): NotificationResponseDto {
    return {
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      scheduledFor: n.scheduledFor ? n.scheduledFor.toISOString() : null,
      sentAt: n.sentAt ? n.sentAt.toISOString() : null,
      snoozedUntil: n.snoozedUntil ? n.snoozedUntil.toISOString() : null,
      relatedEntityType: n.relatedEntityType,
      relatedEntityId: n.relatedEntityId,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    };
  }
}
