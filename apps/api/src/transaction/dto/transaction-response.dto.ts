import { Transaction, TransactionType } from '@personal-os/database';

/** Exact shape returned for a Transaction. */
export class TransactionResponseDto {
  id!: string;
  walletId!: string;
  type!: TransactionType; // INCOME | EXPENSE
  amount!: number;
  category!: string | null;
  description!: string | null;
  transactionDate!: string; // ISO
  transferGroupId!: string | null; // non-null => one leg of a transfer
  createdAt!: string;
  updatedAt!: string;

  static from(t: Transaction): TransactionResponseDto {
    return {
      id: t.id,
      walletId: t.walletId,
      type: t.type,
      amount: t.amount.toNumber(),
      category: t.category,
      description: t.description,
      transactionDate: t.transactionDate.toISOString(),
      transferGroupId: t.transferGroupId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
