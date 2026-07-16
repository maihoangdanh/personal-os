import { IsISO8601 } from 'class-validator';

/**
 * PATCH /notifications/{id}/snooze
 *
 * snoozedUntil is when the reminder should fire again. The service re-arms the
 * reminder: scheduledFor is moved to this time and sentAt is cleared so the cron
 * re-delivers it. Should be a future datetime.
 */
export class SnoozeNotificationDto {
  @IsISO8601()
  snoozedUntil!: string;
}
