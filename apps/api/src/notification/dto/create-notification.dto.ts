import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NotificationType } from '@personal-os/database';

const toUpper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.toUpperCase() : value;

/**
 * POST /notifications
 *
 * type defaults to REMINDER when omitted. scheduledFor is the time the reminder
 * should fire; the internal cron marks sentAt once scheduledFor <= now.
 */
export class CreateNotificationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @Transform(toUpper)
  @IsEnum(NotificationType)
  type?: NotificationType;

  /** ISO-8601 datetime the reminder should fire. */
  @IsOptional()
  @IsISO8601()
  scheduledFor?: string;

  /** Loose pointer, e.g. "Task" | "CalendarEvent" | "Habit". */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  relatedEntityType?: string;

  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;
}
