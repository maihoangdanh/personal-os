import { AuthGate } from "@/features/auth/components/AuthGate";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          <div className="mx-auto max-w-[1180px] px-10 pb-16 pt-[34px]">{children}</div>
        </main>
      </div>
    </AuthGate>
  );
}
