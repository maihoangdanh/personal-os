"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useRegister } from "../hooks/useAuth";

export function RegisterForm() {
  const registerMut = useRegister();
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    workspaceName: "",
  });
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await registerMut.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.workspaceName.trim()
          ? { workspaceName: form.workspaceName.trim() }
          : {}),
      });
    } catch (err) {
      setError(extractApiErrorMessage(err, "Đăng ký thất bại"));
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Tạo tài khoản Personal OS</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Tên</Label>
            <Input
              id="name"
              required
              maxLength={200}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="ban@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mật khẩu (8-72 ký tự)</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workspaceName">Tên Workspace (không bắt buộc)</Label>
            <Input
              id="workspaceName"
              maxLength={200}
              value={form.workspaceName}
              onChange={(e) =>
                setForm((f) => ({ ...f, workspaceName: e.target.value }))
              }
              placeholder="Workspace của tôi"
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={registerMut.isPending}
          >
            {registerMut.isPending ? "Đang tạo..." : "Đăng ký"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
