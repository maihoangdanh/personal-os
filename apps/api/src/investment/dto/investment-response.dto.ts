import { Investment, Prisma } from '@personal-os/database';

function toNum(d: Prisma.Decimal | null): number | null {
  return d === null ? null : d.toNumber();
}

/** Exact shape returned for an Investment. */
export class InvestmentResponseDto {
  id!: string;
  userId!: string;
  name!: string;
  type!: string | null;
  amount!: number; // capital invested
  currentValue!: number | null; // current market value (counts toward Net Worth)
  createdAt!: string;
  updatedAt!: string;

  static from(i: Investment): InvestmentResponseDto {
    return {
      id: i.id,
      userId: i.userId,
      name: i.name,
      type: i.type,
      amount: i.amount.toNumber(),
      currentValue: toNum(i.currentValue),
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    };
  }
}
