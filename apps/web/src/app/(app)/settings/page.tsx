import { SettingsView } from "@/features/settings/components/SettingsView";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Quản lý hồ sơ và mật khẩu tài khoản.</p>
      </div>
      <SettingsView />
    </div>
  );
}
