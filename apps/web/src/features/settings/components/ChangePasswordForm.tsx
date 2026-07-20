"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useChangePassword } from "@/features/auth/hooks/useAuth";

export function ChangePasswordForm() {
  const changeMut = useChangePassword();
  const [form, setForm] = React.useState({ current: "", next: "", confirm: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (form.next.length < 8) {
      setError("Mật khẩu mới phải từ 8 ký tự.");
      return;
    }
    if (form.next !== form.confirm) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }
    try {
      await changeMut.mutateAsync({ currentPassword: form.current, newPassword: form.next });
      setOk(true);
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không đổi được mật khẩu"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Đổi mật khẩu</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cp-current">Mật khẩu hiện tại *</Label>
            <Input
              id="cp-current"
              type="password"
              required
              autoComplete="current-password"
              value={form.current}
              onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-next">Mật khẩu mới (8-72 ký tự) *</Label>
            <Input
              id="cp-next"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              value={form.next}
              onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">Xác nhận mật khẩu mới *</Label>
            <Input
              id="cp-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          {ok && (
            <p className="rounded-md bg-success/15 px-3 py-2 text-sm text-success">
              Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới.
            </p>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                changeMut.isPending || !form.current || !form.next || !form.confirm
              }
            >
              {changeMut.isPending ? "Đang đổi..." : "Đổi mật khẩu"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
