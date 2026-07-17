import { IsOptional, Matches } from 'class-validator';

/** GET /finance/report?month=YYYY-MM (defaults to the current month). */
export class ReportQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be in YYYY-MM format' })
  month?: string;
}
