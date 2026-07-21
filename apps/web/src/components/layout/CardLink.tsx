import Link from "next/link";
import { cn } from "@/lib/utils";

/** Link nhỏ mono viết HOA màu accent kiểu "XEM TẤT CẢ →" (pattern header card của mockup). */
export function CardLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "font-mono text-[11px] uppercase tracking-[0.06em] text-primary transition-colors hover:text-accent-2",
        className,
      )}
    >
      {children}
    </Link>
  );
}
