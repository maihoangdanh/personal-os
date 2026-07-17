import { Prisma, TransactionType } from '@personal-os/database';

/**
 * Wallet.balance is a backend-maintained computed column. REAL MONEY: always
 * recompute from the source of truth (the wallet's transactions) inside a
 * $transaction — never add/subtract deltas (avoids cumulative drift).
 *
 * balance = Σ(amount WHERE type=INCOME) − Σ(amount WHERE type=EXPENSE),
 * over non-deleted transactions of the wallet. Transfer legs are ordinary
 * INCOME/EXPENSE rows, so they are already included correctly here.
 */
export async function computeWalletBalance(
  tx: Prisma.TransactionClient,
  walletId: string,
): Promise<Prisma.Decimal> {
  const [income, expense] = await Promise.all([
    tx.transaction.aggregate({
      where: { walletId, type: TransactionType.INCOME, deletedAt: null },
      _sum: { amount: true },
    }),
    tx.transaction.aggregate({
      where: { walletId, type: TransactionType.EXPENSE, deletedAt: null },
      _sum: { amount: true },
    }),
  ]);
  const inc = income._sum.amount ?? new Prisma.Decimal(0);
  const exp = expense._sum.amount ?? new Prisma.Decimal(0);
  return inc.minus(exp);
}

/** Recompute and persist a wallet's balance. Returns the new balance. */
export async function persistWalletBalance(
  tx: Prisma.TransactionClient,
  walletId: string,
): Promise<Prisma.Decimal> {
  const balance = await computeWalletBalance(tx, walletId);
  await tx.wallet.update({ where: { id: walletId }, data: { balance } });
  return balance;
}

export interface RealizedFilter {
  userId: string;
  type: TransactionType;
  from?: Date;
  to?: Date;
  category?: string; // matched case-insensitively
}

/**
 * Σ amount of REALIZED income/expense for a user — the single place that applies
 * `transferGroupId IS NULL` so transfer legs are never double-counted as
 * income/expense in Budget-vs-actual or Reports. ⚠️ Any spending/report total
 * MUST go through here.
 */
export async function sumRealized(
  client: Prisma.TransactionClient,
  { userId, type, from, to, category }: RealizedFilter,
): Promise<Prisma.Decimal> {
  const where: Prisma.TransactionWhereInput = {
    deletedAt: null,
    transferGroupId: null, // exclude transfers
    type,
    wallet: { userId },
  };
  if (from || to) {
    where.transactionDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  if (category) {
    where.category = { equals: category, mode: 'insensitive' };
  }
  const agg = await client.transaction.aggregate({ where, _sum: { amount: true } });
  return agg._sum.amount ?? new Prisma.Decimal(0);
}

/**
 * Net Worth = Σ Wallet.balance + Σ Investment.currentValue + Σ Asset.value
 * (confirmed by user; no liabilities yet). Investment uses currentValue.
 */
export async function computeNetWorth(
  client: Prisma.TransactionClient,
  userId: string,
): Promise<{
  netWorth: number;
  walletTotal: number;
  investmentTotal: number;
  assetTotal: number;
}> {
  const [wallets, investments, assets] = await Promise.all([
    client.wallet.aggregate({ where: { userId, deletedAt: null }, _sum: { balance: true } }),
    client.investment.aggregate({
      where: { userId, deletedAt: null },
      _sum: { currentValue: true },
    }),
    client.asset.aggregate({ where: { userId, deletedAt: null }, _sum: { value: true } }),
  ]);
  const walletTotal = (wallets._sum.balance ?? new Prisma.Decimal(0)).toNumber();
  const investmentTotal = (investments._sum.currentValue ?? new Prisma.Decimal(0)).toNumber();
  const assetTotal = (assets._sum.value ?? new Prisma.Decimal(0)).toNumber();
  return {
    netWorth: walletTotal + investmentTotal + assetTotal,
    walletTotal,
    investmentTotal,
    assetTotal,
  };
}
