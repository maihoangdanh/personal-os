"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Moon,
  Repeat,
  Settings,
  Sun,
  Target,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useUnreadCount } from "@/features/notification/hooks/useNotifications";
import { useTheme } from "@/components/theme/useTheme";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: "unread";
};

const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Daily",
    items: [
      { href: "/tasks", label: "Tasks", icon: ListChecks },
      { href: "/habits", label: "Habits", icon: Repeat },
      { href: "/reminders", label: "Reminders", icon: Bell, badge: "unread" },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/journal", label: "Journal", icon: BookOpen },
    ],
  },
  {
    label: "Goal & Project",
    items: [
      { href: "/goals", label: "Goals", icon: Target },
      { href: "/projects", label: "Projects", icon: FolderKanban },
    ],
  },
  {
    label: "Finance",
    items: [{ href: "/finance", label: "Finance", icon: Wallet }],
  },
  {
    label: "Analytics",
    items: [{ href: "/analytics", label: "Analytics", icon: BarChart3 }],
  },
  {
    label: "Assistant",
    items: [{ href: "/ai", label: "AI Assistant", icon: Bot }],
  },
  {
    label: "System",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const chars =
    parts.length >= 2
      ? parts[parts.length - 2][0] + parts[parts.length - 1][0]
      : parts[0].slice(0, 2);
  return chars.toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const logoutMut = useLogout();
  const user = useAuthStore((s) => s.user);
  const unreadQuery = useUnreadCount();
  const unread = unreadQuery.data ?? 0;
  const { theme, toggle } = useTheme();

  return (
    <aside className="flex w-[236px] flex-none flex-col bg-[#191512] px-[14px] pb-4 pt-5 text-[#EDE6DA]">
      {/* Logo */}
      <div className="flex items-baseline gap-2 px-2.5 pb-[18px] pt-0.5">
        <span className="font-serif text-[20px] font-semibold italic tracking-[0.01em]">
          Personal OS
        </span>
        <span className="font-mono text-[10px] tracking-[0.12em] text-primary">v2</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={group.label ?? `group-${groupIdx}`} className="flex flex-col gap-0.5">
            {group.label && (
              <div className="px-3 pb-1.5 pt-4 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#EDE6DA]/[0.38]">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              const showBadge = item.badge === "unread" && unread > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-[11px] rounded-[10px] px-3 py-2 text-[13.5px] transition-colors",
                    active
                      ? "bg-primary/[0.16] font-semibold text-[#FF7A4D]"
                      : "font-medium text-[#EDE6DA]/[0.72] hover:bg-[#EDE6DA]/[0.07]",
                  )}
                >
                  <Icon className="h-4 w-4 flex-none opacity-90" strokeWidth={1.7} />
                  <span className="flex-1">{item.label}</span>
                  {showBadge && (
                    <span className="rounded-full bg-primary/90 px-[7px] py-px font-mono text-[10.5px] text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggle}
        className="mb-3 flex items-center gap-2.5 rounded-[10px] border border-[#EDE6DA]/[0.14] px-3 py-[9px] text-[12.5px] text-[#EDE6DA]/[0.85] transition-colors hover:bg-[#EDE6DA]/[0.07]"
      >
        {theme === "dark" ? (
          <Sun className="h-[15px] w-[15px]" strokeWidth={1.7} />
        ) : (
          <Moon className="h-[15px] w-[15px]" strokeWidth={1.7} />
        )}
        {theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
      </button>

      {/* User */}
      <div className="flex items-center gap-2.5 px-1.5 py-1">
        <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-primary text-[12.5px] font-bold text-white">
          {initials(user?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold">{user?.name ?? "—"}</div>
          <div className="truncate text-[10.5px] text-[#EDE6DA]/50">{user?.email ?? ""}</div>
        </div>
        <button
          type="button"
          title="Đăng xuất"
          disabled={logoutMut.isPending}
          onClick={() => logoutMut.mutate()}
          className="flex-none text-[#EDE6DA]/55 transition-colors hover:text-[#FF7A4D]"
        >
          <LogOut className="h-[15px] w-[15px]" strokeWidth={1.7} />
        </button>
      </div>
    </aside>
  );
}
