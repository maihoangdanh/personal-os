"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useUpdateProfile } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

export function ProfileSettings() {
  const user = useAuthStore((s) => s.user);
  const updateMut = useUpdateProfile();
  const [name, setName] = React.useState(user?.name ?? "");
  const [timezone, setTimezone] = React.useState(user?.timezone ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  // Đồng bộ khi user hydrate xong.
  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setTimezone(user.timezone);
    }
  }, [user]);

  const dirty = user ? name.trim() !== user.name || timezone.trim() !== user.timezone : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    try {
      await updateMut.mutateAsync({ name: name.trim(), timezone: timezone.trim() });
      setOk(true);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không cập nhật được hồ sơ"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hồ sơ</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-email">Email</Label>
            <Input id="s-email" value={user?.email ?? ""} disabled readOnly />
            <p className="text-xs text-muted-foreground">Email không đổi được ở đây.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Tên hiển thị *</Label>
            <Input
              id="s-name"
              required
              maxLength={200}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setOk(false);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-timezone">Múi giờ</Label>
            <Input
              id="s-timezone"
              maxLength={64}
              value={timezone}
              onChange={(e) => {
                setTimezone(e.target.value);
                setOk(false);
              }}
              placeholder="VD: Asia/Ho_Chi_Minh"
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          {ok && (
            <p className="rounded-md bg-success/15 px-3 py-2 text-sm text-success">
              Đã lưu hồ sơ.
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={updateMut.isPending || !dirty || !name.trim()}>
              {updateMut.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
