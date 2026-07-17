import { Wallet, WalletType } from '@personal-os/database';

/** Exact shape returned for a Wallet. balance is backend-maintained. */
export class WalletResponseDto {
  id!: string;
  userId!: string;
  name!: string;
  type!: WalletType; // CASH | BANK | CREDIT_CARD | E_WALLET | SAVINGS
  balance!: number; // Σ INCOME − Σ EXPENSE of this wallet's transactions
  createdAt!: string;
  updatedAt!: string;

  static from(w: Wallet): WalletResponseDto {
    return {
      id: w.id,
      userId: w.userId,
      name: w.name,
      type: w.type,
      balance: w.balance.toNumber(),
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    };
  }
}
