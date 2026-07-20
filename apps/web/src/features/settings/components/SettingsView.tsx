"use client";

import { ProfileSettings } from "./ProfileSettings";
import { ChangePasswordForm } from "./ChangePasswordForm";

export function SettingsView() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ProfileSettings />
      <ChangePasswordForm />
    </div>
  );
}
