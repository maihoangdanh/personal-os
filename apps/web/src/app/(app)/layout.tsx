import { AuthGate } from "@/features/auth/components/AuthGate";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden bg-background">
          <div className="mx-auto max-w-5xl px-6 py-6">{children}</div>
        </main>
      </div>
    </AuthGate>
  );
}
