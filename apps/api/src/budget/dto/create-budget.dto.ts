import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const BUDGET_PERIODS = ['MONTHLY', 'WEEKLY', 'YEARLY'] as const;

/** POST /budgets. category null = overall budget; else caps a Transaction.category. */
export class CreateBudgetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsIn(BUDGET_PERIODS)
  period?: (typeof BUDGET_PERIODS)[number];

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
