import { AuthGuard } from '@/components/auth-guard';
import { ActiveKlubProvider } from '@/components/active-klub-provider';
import { Sidebar } from '@/components/dashboard/sidebar';
import { ActiveKlubGate } from '@/components/active-klub-gate';
import { PersonaSwitcher } from '@/components/dashboard/persona-switcher';

export default function KlubScopedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ActiveKlubProvider>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <ActiveKlubGate>{children}</ActiveKlubGate>
          </div>
          <PersonaSwitcher />
        </div>
      </ActiveKlubProvider>
    </AuthGuard>
  );
}
