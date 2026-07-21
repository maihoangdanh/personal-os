"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { useTheme } from "@/components/theme/useTheme";
import type { Theme } from "@/lib/theme";
import { ProfileSettings } from "./ProfileSettings";
import { ChangePasswordForm } from "./ChangePasswordForm";

export function SettingsView() {
  return (
    <div className="max-w-[860px] space-y-5">
      <PageHeader eyebrow="HỆ THỐNG" title="Settings" description="Hồ sơ, giao diện và bảo mật." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProfileSettings />
        <div className="flex flex-col gap-4">
          <AppearanceCard />
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}

function AppearanceCard() {
  const { theme, toggle } = useTheme();

  function setTheme(target: Theme) {
    if (theme !== target) toggle();
  }

  const options: { key: Theme; label: string; className: string }[] = [
    { key: "light", label: "Sáng", className: "bg-[#F4EFE6] text-[#221D17]" },
    { key: "dark", label: "Tối", className: "bg-[#15120F] text-[#F0EADE]" },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-card">
      <div className="mb-1.5 text-[15px] font-bold">Giao diện</div>
      <p className="mb-3.5 text-[12px] text-muted-foreground">Chọn chế độ hiển thị.</p>
      <div className="flex gap-2.5">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setTheme(o.key)}
            className={
              "flex-1 rounded-xl border-[1.5px] p-3.5 text-center text-[12.5px] font-semibold " +
              o.className +
              (theme === o.key ? " border-primary" : " border-border")
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
