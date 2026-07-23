import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { RecurrenceFrequency } from '@personal-os/database';

/**
 * POST /recurring-tasks
 *
 * weekDays chỉ bắt buộc khi frequency=WEEKLY (kiểm tra ở service, không ở
 * DTO — class-validator không có "required if" đơn giản mà không thêm thư
 * viện, và validate liên-field này gắn liền business rule hơn là input shape).
 */
export class CreateRecurringTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  impact!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  urgency!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimateMinute?: number;

  @IsUUID()
  projectId!: string;

  @IsEnum(RecurrenceFrequency)
  frequency!: RecurrenceFrequency;

  /** ISO weekday 1=T2..7=CN. Bắt buộc + không rỗng khi frequency=WEEKLY (service validate). */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekDays?: number[];

  /** "HH:mm", optional — không set thì deadline sinh ra là 23:59 mỗi ngày. */
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'timeOfDay must be HH:mm' })
  timeOfDay?: string;
}
