import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** nhãn mono nhỏ viết HOA màu accent phía trên tiêu đề (pattern "eyebrow" mockup) */
  eyebrow: string;
  /** tiêu đề serif lớn (Playfair) */
  title: React.ReactNode;
  /** mô tả phụ */
  description?: React.ReactNode;
  /** khu vực bên phải (nút hành động, pill toggle...) */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Header chuẩn mọi trang: eyebrow (mono uppercase accent) + tiêu đề serif lớn + mô tả.
 * Dùng utility trực tiếp (không custom @layer class — tránh bị Tailwind purge).
 */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </div>
        <h1 className="mt-1.5 font-serif text-3xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
