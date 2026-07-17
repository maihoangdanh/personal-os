import { KPI, Prisma } from '@personal-os/database';

function toNum(d: Prisma.Decimal | null): number | null {
  return d === null ? null : d.toNumber();
}

/** Exact shape returned for a KPI. */
export class KpiResponseDto {
  id!: string;
  goalId!: string;
  name!: string;
  unit!: string | null;
  targetValue!: number | null;
  currentValue!: number;
  createdAt!: string;
  updatedAt!: string;

  static from(k: KPI): KpiResponseDto {
    return {
      id: k.id,
      goalId: k.goalId,
      name: k.name,
      unit: k.unit,
      targetValue: toNum(k.targetValue),
      currentValue: k.currentValue.toNumber(),
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString(),
    };
  }
}
