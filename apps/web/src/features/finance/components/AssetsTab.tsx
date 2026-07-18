"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useAssets, useCreateAsset, useDeleteAsset, useUpdateAsset } from "../hooks/useFinance";
import type { Asset } from "../types/finance.types";

export function AssetsTab() {
  const { data, isLoading, isError, error } = useAssets();
  const deleteMut = useDeleteAsset();
  const [dialog, setDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<Asset | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDialog(true);
          }}
        >
          <Plus className="h-4 w-4" /> Thêm tài sản
        </Button>
      </div>
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
      )}
      {isLoading && <div className="h-20 animate-pulse rounded-lg bg-muted" />}
      {isError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {extractApiErrorMessage(error)}
        </p>
      )}
      {!isLoading && !isError && data && data.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Chưa có tài sản nào.
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data?.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{a.name}</span>
                  {a.type && <Badge variant="secondary">{a.type}</Badge>}
                </div>
                <div className="mt-1 text-sm font-medium">{formatCurrency(a.value)}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Sửa"
                  onClick={() => {
                    setEditing(a);
                    setDialog(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Xoá"
                  disabled={deleteMut.isPending}
                  onClick={async () => {
                    setActionError(null);
                    try {
                      await deleteMut.mutateAsync(a.id);
                    } catch (e) {
                      setActionError(extractApiErrorMessage(e));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <AssetFormDialog open={dialog} onOpenChange={setDialog} asset={editing} />
    </div>
  );
}

function AssetFormDialog({
  open,
  onOpenChange,
  asset,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  asset?: Asset | null;
}) {
  const isEdit = !!asset;
  const createMut = useCreateAsset();
  const updateMut = useUpdateAsset();
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: "", type: "", value: "" });

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      name: asset?.name ?? "",
      type: asset?.type ?? "",
      value: asset?.value != null ? String(asset.value) : "",
    });
  }, [open, asset]);

  const submitting = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valueNum = Number(form.value);
    if (!(valueNum >= 0) || form.value === "") {
      setError("Giá trị phải >= 0.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      value: valueNum,
      ...(form.type.trim() ? { type: form.type.trim() } : {}),
    };
    try {
      if (isEdit && asset) await updateMut.mutateAsync({ id: asset.id, payload });
      else await createMut.mutateAsync(payload);
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? "Sửa tài sản" : "Thêm tài sản"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="a-name">Tên *</Label>
          <Input
            id="a-name"
            required
            maxLength={255}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="VD: Xe máy"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="a-type">Loại</Label>
            <Input
              id="a-type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              placeholder="Vehicle"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-value">Giá trị (&gt;= 0) *</Label>
            <Input
              id="a-value"
              type="number"
              step="0.01"
              min={0}
              required
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            />
          </div>
        </div>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Huỷ
          </Button>
          <Button type="submit" disabled={submitting || !form.name.trim()}>
            {submitting ? "Đang lưu..." : isEdit ? "Lưu" : "Thêm"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
