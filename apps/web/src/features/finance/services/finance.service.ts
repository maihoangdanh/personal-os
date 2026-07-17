import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type {
  Asset,
  Budget,
  BudgetStatus,
  CreateAssetPayload,
  CreateBudgetPayload,
  CreateInvestmentPayload,
  CreateTransactionPayload,
  CreateWalletPayload,
  FinanceReport,
  Investment,
  NetWorth,
  Transaction,
  TransactionDeleteResult,
  TransactionFilter,
  TransferPayload,
  TransferResult,
  UpdateAssetPayload,
  UpdateBudgetPayload,
  UpdateInvestmentPayload,
  UpdateTransactionPayload,
  UpdateWalletPayload,
  Wallet,
} from "../types/finance.types";

function clean(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}
const ALL = { page: 1, pageSize: 100, sortOrder: "desc" as const };

export const walletService = {
  async list(): Promise<Wallet[]> {
    const res = await apiClient.get<ApiEnvelope<Wallet[]>>("/wallets", { params: ALL });
    return res.data.data;
  },
  async create(p: CreateWalletPayload): Promise<Wallet> {
    return (await apiClient.post<ApiEnvelope<Wallet>>("/wallets", p)).data.data;
  },
  async update(id: string, p: UpdateWalletPayload): Promise<Wallet> {
    return (await apiClient.patch<ApiEnvelope<Wallet>>(`/wallets/${id}`, p)).data.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete<ApiEnvelope<unknown>>(`/wallets/${id}`);
  },
};

export const transactionService = {
  async list(filter?: TransactionFilter): Promise<Transaction[]> {
    const res = await apiClient.get<ApiEnvelope<Transaction[]>>("/transactions", {
      params: clean({ ...ALL, ...filter }),
    });
    return res.data.data;
  },
  async create(p: CreateTransactionPayload): Promise<Transaction> {
    return (await apiClient.post<ApiEnvelope<Transaction>>("/transactions", p)).data.data;
  },
  async transfer(p: TransferPayload): Promise<TransferResult> {
    return (await apiClient.post<ApiEnvelope<TransferResult>>("/transactions/transfer", p)).data.data;
  },
  async update(id: string, p: UpdateTransactionPayload): Promise<Transaction> {
    return (await apiClient.patch<ApiEnvelope<Transaction>>(`/transactions/${id}`, p)).data.data;
  },
  async remove(id: string): Promise<TransactionDeleteResult> {
    return (await apiClient.delete<ApiEnvelope<TransactionDeleteResult>>(`/transactions/${id}`)).data.data;
  },
};

export const budgetService = {
  async list(filter?: { category?: string }): Promise<Budget[]> {
    const res = await apiClient.get<ApiEnvelope<Budget[]>>("/budgets", {
      params: clean({ ...ALL, ...filter }),
    });
    return res.data.data;
  },
  async status(id: string): Promise<BudgetStatus> {
    return (await apiClient.get<ApiEnvelope<BudgetStatus>>(`/budgets/${id}/status`)).data.data;
  },
  async create(p: CreateBudgetPayload): Promise<Budget> {
    return (await apiClient.post<ApiEnvelope<Budget>>("/budgets", p)).data.data;
  },
  async update(id: string, p: UpdateBudgetPayload): Promise<Budget> {
    return (await apiClient.patch<ApiEnvelope<Budget>>(`/budgets/${id}`, p)).data.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete<ApiEnvelope<unknown>>(`/budgets/${id}`);
  },
};

export const investmentService = {
  async list(): Promise<Investment[]> {
    return (await apiClient.get<ApiEnvelope<Investment[]>>("/investments", { params: ALL })).data.data;
  },
  async create(p: CreateInvestmentPayload): Promise<Investment> {
    return (await apiClient.post<ApiEnvelope<Investment>>("/investments", p)).data.data;
  },
  async update(id: string, p: UpdateInvestmentPayload): Promise<Investment> {
    return (await apiClient.patch<ApiEnvelope<Investment>>(`/investments/${id}`, p)).data.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete<ApiEnvelope<unknown>>(`/investments/${id}`);
  },
};

export const assetService = {
  async list(): Promise<Asset[]> {
    return (await apiClient.get<ApiEnvelope<Asset[]>>("/assets", { params: ALL })).data.data;
  },
  async create(p: CreateAssetPayload): Promise<Asset> {
    return (await apiClient.post<ApiEnvelope<Asset>>("/assets", p)).data.data;
  },
  async update(id: string, p: UpdateAssetPayload): Promise<Asset> {
    return (await apiClient.patch<ApiEnvelope<Asset>>(`/assets/${id}`, p)).data.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete<ApiEnvelope<unknown>>(`/assets/${id}`);
  },
};

export const financeService = {
  async report(month?: string): Promise<FinanceReport> {
    const res = await apiClient.get<ApiEnvelope<FinanceReport>>("/finance/report", {
      params: month ? { month } : {},
    });
    return res.data.data;
  },
  async netWorth(): Promise<NetWorth> {
    return (await apiClient.get<ApiEnvelope<NetWorth>>("/finance/net-worth")).data.data;
  },
};
