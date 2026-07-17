import { Budget } from '@personal-os/database';

/** Exact shape returned for a Budget. */
export class BudgetResponseDto {
  id!: string;
  userId!: string;
  name!: string;
  category!: string | null; // null = overall budget
  amount!: number;
  period!: string; // MONTHLY | WEEKLY | YEARLY
  startDate!: string | null; // YYYY-MM-DD
  endDate!: string | null; // YYYY-MM-DD
  createdAt!: string;
  updatedAt!: string;

  static from(b: Budget): BudgetResponseDto {
    return {
      id: b.id,
      userId: b.userId,
      name: b.name,
      category: b.category,
      amount: b.amount.toNumber(),
      period: b.period,
      startDate: b.startDate ? b.startDate.toISOString().slice(0, 10) : null,
      endDate: b.endDate ? b.endDate.toISOString().slice(0, 10) : null,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }
}
