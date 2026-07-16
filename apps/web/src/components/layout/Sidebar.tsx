"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useUnreadCount } from "@/features/notification/hooks/useNotifications";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/habits", label: "Habits", icon: Repeat },
  { href: "/reminders", label: "Reminders", icon: Bell, badge: "unread" as const },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

export function Sidebar() {
  const pathname = usePathname();
  const logoutMut = useLogout();
  const user = useAuthStore((s) => s.user);
  const unreadQuery = useUnreadCount();
  const unread = unreadQuery.data ?? 0;

  return (
    <aside className="flex w-60 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <span className="text-lg font-bold">Personal OS</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          const showBadge = item.badge === "unread" && unread > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        {user && (
          <div className="mb-2 px-1 text-xs text-muted-foreground">
            <div className="truncate font-medium text-foreground">{user.name}</div>
            <div className="truncate">{user.email}</div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={logoutMut.isPending}
          onClick={() => logoutMut.mutate()}
        >
          <LogOut className="h-4 w-4" /> Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
