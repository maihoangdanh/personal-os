/**
 * Finance types — copy CHÍNH XÁC từ _workspace/12_backend_finance.md.
 *
 * ⚠️ TIỀN THẬT. Mọi tiền là `number` (2 chữ số thập phân) do backend tính sẵn — FE CHỈ hiển thị,
 * KHÔNG tự tính lại / làm tròn sai lệch. balance/actual/netWorth... đọc thẳng từ response.
 *
 * Ranh giới:
 * - Enum input không phân biệt hoa/thường; response CHỮ HOA.
 * - List trả MẢNG trong `data` + phân trang `meta`. Query lists đều extends PaginationQueryDto
 *   (page/pageSize 1..100/sortOrder) + filter riêng. Transaction list liệt kê CẢ 2 leg transfer.
 * - Transfer = 1 endpoint tạo 2 dòng (EXPENSE ví nguồn + INCOME ví đích, cùng transferGroupId).
 * - Không sửa/xoá riêng 1 leg transfer (transferGroupId != null): update → 422; delete → xoá cả 2 leg.
 */

// ---------- WALLET ----------
export const WALLET_TYPES = ["CASH", "BANK", "CREDIT_CARD", "E_WALLET", "SAVINGS"] as const;
export type WalletType = (typeof WALLET_TYPES)[number];

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: number; // backend-maintained = Σ INCOME − Σ EXPENSE
  createdAt: string;
  updatedAt: string;
}
export interface CreateWalletPayload {
  name: string; // 1..100
  type: WalletType;
}
export type UpdateWalletPayload = Partial<CreateWalletPayload>;

// ---------- TRANSACTION ----------
export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number; // > 0
  category: string | null;
  description: string | null;
  transactionDate: string; // ISO
  transferGroupId: string | null; // != null → leg của transfer (không sửa/xoá riêng)
  createdAt: string;
  updatedAt: string;
}
export interface CreateTransactionPayload {
  walletId: string;
  type: TransactionType;
  amount: number; // > 0 (<=0 → 422)
  category?: string; // free-text <= 100
  description?: string; // <= 255
  transactionDate?: string; // ISO, default now
}
export type UpdateTransactionPayload = Partial<Omit<CreateTransactionPayload, "walletId">> & {
  walletId?: string;
};

export interface TransferPayload {
  fromWalletId: string;
  toWalletId: string; // khác fromWalletId (else 422)
  amount: number; // > 0
  category?: string;
  description?: string;
  transactionDate?: string;
}
/** Response POST /transactions/transfer */
export interface TransferResult {
  transferGroupId: string;
  from: Transaction; // leg EXPENSE
  to: Transaction; // leg INCOME
}
/** Response DELETE transaction (thường: 1 id; transfer: 2 id) */
export interface TransactionDeleteResult {
  deletedIds: string[];
  deleted: true;
}

export interface TransactionFilter {
  walletId?: string;
  type?: TransactionType;
  category?: string;
  dateFrom?: string; // ISO8601
  dateTo?: string; // ISO8601
}

// ---------- BUDGET ----------
export const BUDGET_PERIODS = ["MONTHLY", "WEEKLY", "YEARLY"] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

export interface Budget {
  id: string;
  userId: string;
  name: string;
  category: string | null; // null = ngân sách TỔNG
  amount: number; // > 0
  period: BudgetPeriod;
  startDate: string | null; // "YYYY-MM-DD"
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface BudgetStatus {
  budgetId: string;
  category: string | null;
  amount: number;
  actual: number; // Σ EXPENSE cùng category trong kỳ (loại transfer)
  remaining: number;
  exceeded: boolean;
  period: { from: string; to: string };
}
export interface CreateBudgetPayload {
  name: string; // 1..100
  category?: string; // free-text; bỏ trống = ngân sách tổng
  amount: number; // > 0
  period?: BudgetPeriod; // default MONTHLY
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string;
}
export type UpdateBudgetPayload = Partial<CreateBudgetPayload>;

// ---------- INVESTMENT ----------
export interface Investment {
  id: string;
  userId: string;
  name: string;
  type: string | null; // free-text (crypto/stock/gold/fund)
  amount: number; // vốn > 0
  currentValue: number | null; // dùng cho Net Worth
  createdAt: string;
  updatedAt: string;
}
export interface CreateInvestmentPayload {
  name: string; // 1..255
  type?: string;
  amount: number; // > 0
  currentValue?: number; // >= 0, default = amount
}
export type UpdateInvestmentPayload = Partial<CreateInvestmentPayload>;

// ---------- ASSET ----------
export interface Asset {
  id: string;
  userId: string;
  name: string;
  type: string | null; // free-text
  value: number; // >= 0
  createdAt: string;
  updatedAt: string;
}
export interface CreateAssetPayload {
  name: string; // 1..255
  type?: string;
  value: number; // >= 0
}
export type UpdateAssetPayload = Partial<CreateAssetPayload>;

// ---------- FINANCE REPORT / NET WORTH ----------
export interface FinanceReport {
  month: string; // "YYYY-MM"
  period: { from: string; to: string };
  income: number;
  expense: number;
  profit: number; // income - expense
  savingRate: number; // tỉ lệ 0..1
  savingRatePercent: number; // savingRate * 100
}
export interface NetWorth {
  netWorth: number;
  walletTotal: number;
  investmentTotal: number;
  assetTotal: number;
}
