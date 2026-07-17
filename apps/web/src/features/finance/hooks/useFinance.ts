"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assetService,
  budgetService,
  financeService,
  investmentService,
  transactionService,
  walletService,
} from "../services/finance.service";
import type {
  CreateAssetPayload,
  CreateBudgetPayload,
  CreateInvestmentPayload,
  CreateTransactionPayload,
  CreateWalletPayload,
  TransactionFilter,
  TransferPayload,
  UpdateAssetPayload,
  UpdateBudgetPayload,
  UpdateInvestmentPayload,
  UpdateTransactionPayload,
  UpdateWalletPayload,
} from "../types/finance.types";

export const financeKeys = {
  wallets: ["wallets"] as const,
  transactions: (f?: TransactionFilter) => ["transactions", f ?? {}] as const,
  budgets: ["budgets"] as const,
  budgetStatus: (id: string) => ["budgets", "status", id] as const,
  investments: ["investments"] as const,
  assets: ["assets"] as const,
  report: (month?: string) => ["finance", "report", month ?? "current"] as const,
  netWorth: ["finance", "netWorth"] as const,
};

/**
 * Sau khi transaction/transfer/wallet đổi → balance ví + report + net-worth đều đổi.
 * Invalidate rộng nhóm tiền để mọi số hiển thị lại đúng (backend đã tính sẵn).
 */
function useInvalidateMoney() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["wallets"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["budgets"] });
    qc.invalidateQueries({ queryKey: ["finance"] });
  };
}

// ---------- WALLET ----------
export function useWallets() {
  return useQuery({ queryKey: financeKeys.wallets, queryFn: () => walletService.list() });
}
export function useCreateWallet() {
  const inv = useInvalidateMoney();
  return useMutation({ mutationFn: (p: CreateWalletPayload) => walletService.create(p), onSuccess: inv });
}
export function useUpdateWallet() {
  const inv = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWalletPayload }) => walletService.update(id, payload),
    onSuccess: inv,
  });
}
export function useDeleteWallet() {
  const inv = useInvalidateMoney();
  return useMutation({ mutationFn: (id: string) => walletService.remove(id), onSuccess: inv });
}

// ---------- TRANSACTION ----------
export function useTransactions(filter?: TransactionFilter) {
  return useQuery({
    queryKey: financeKeys.transactions(filter),
    queryFn: () => transactionService.list(filter),
  });
}
export function useCreateTransaction() {
  const inv = useInvalidateMoney();
  return useMutation({ mutationFn: (p: CreateTransactionPayload) => transactionService.create(p), onSuccess: inv });
}
export function useTransfer() {
  const inv = useInvalidateMoney();
  return useMutation({ mutationFn: (p: TransferPayload) => transactionService.transfer(p), onSuccess: inv });
}
export function useUpdateTransaction() {
  const inv = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTransactionPayload }) =>
      transactionService.update(id, payload),
    onSuccess: inv,
  });
}
export function useDeleteTransaction() {
  const inv = useInvalidateMoney();
  return useMutation({ mutationFn: (id: string) => transactionService.remove(id), onSuccess: inv });
}

// ---------- BUDGET ----------
export function useBudgets() {
  return useQuery({ queryKey: financeKeys.budgets, queryFn: () => budgetService.list() });
}
export function useBudgetStatus(id: string) {
  return useQuery({
    queryKey: financeKeys.budgetStatus(id),
    queryFn: () => budgetService.status(id),
    enabled: !!id,
  });
}
export function useCreateBudget() {
  const inv = useInvalidateMoney();
  return useMutation({ mutationFn: (p: CreateBudgetPayload) => budgetService.create(p), onSuccess: inv });
}
export function useUpdateBudget() {
  const inv = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBudgetPayload }) => budgetService.update(id, payload),
    onSuccess: inv,
  });
}
export function useDeleteBudget() {
  const inv = useInvalidateMoney();
  return useMutation({ mutationFn: (id: string) => budgetService.remove(id), onSuccess: inv });
}

// ---------- INVESTMENT ----------
export function useInvestments() {
  return useQuery({ queryKey: financeKeys.investments, queryFn: () => investmentService.list() });
}
export function useCreateInvestment() {
  const inv = useInvalidateMoney();
  return useMutation({ mutationFn: (p: CreateInvestmentPayload) => investmentService.create(p), onSuccess: inv });
}
export function useUpdateInvestment() {
  const inv = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateInvestmentPayload }) =>
      investmentService.update(id, payload),
    onSuccess: inv,
  });
}
export function useDeleteInvestment() {
  const inv = useInvalidateMoney();
  return useMutation({ mutationFn: (id: string) => investmentService.remove(id), onSuccess: inv });
}

// ---------- ASSET ----------
export function useAssets() {
  return useQuery({ queryKey: financeKeys.assets, queryFn: () => assetService.list() });
}
export function useCreateAsset() {
  const inv = useInvalidateMoney();
  return useMutation({ mutationFn: (p: CreateAssetPayload) => assetService.create(p), onSuccess: inv });
}
export function useUpdateAsset() {
  const inv = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAssetPayload }) => assetService.update(id, payload),
    onSuccess: inv,
  });
}
export function useDeleteAsset() {
  const inv = useInvalidateMoney();
  return useMutation({ mutationFn: (id: string) => assetService.remove(id), onSuccess: inv });
}

// ---------- REPORT / NET WORTH ----------
export function useFinanceReport(month?: string) {
  return useQuery({ queryKey: financeKeys.report(month), queryFn: () => financeService.report(month) });
}
export function useNetWorth() {
  return useQuery({ queryKey: financeKeys.netWorth, queryFn: () => financeService.netWorth() });
}
