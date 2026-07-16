import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { NotificationType } from '@personal-os/database';

const toUpper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.toUpperCase() : value;

/** GET /notifications query params. Both filters are optional. */
export class QueryNotificationDto {
  /** ?isRead=true | false — filter by read state. */
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true' || value === true,
  )
  @IsBoolean()
  isRead?: boolean;

  /** ?type=REMINDER | DEADLINE | SYSTEM | ACHIEVEMENT (case-insensitive). */
  @IsOptional()
  @Transform(toUpper)
  @IsEnum(NotificationType)
  type?: NotificationType;
}
