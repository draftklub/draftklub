'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/lib/api/me';

/**
 * Sprint D PR2 — guard de área admin. Só SUPER_ADMIN entra. Outros caem
 * em /home com 403 (cliente faz redirect; backend bloqueia o endpoint
 * via PolicyEngine de qualquer forma).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { data: me, error } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  React.useEffect(() => {
    if (!me) return;
    const isSuperAdmin = me.roleAssignments.some((r) => r.role === 'PLATFORM_OWNER');
    if (!isSuperAdmin) router.replace('/home');
  }, [me, router]);

  React.useEffect(() => {
    if (error) router.replace('/home');
  }, [error, router]);

  const allowed: boolean | null =
    me === undefined ? null : me.roleAssignments.some((r) => r.role === 'PLATFORM_OWNER');

  if (allowed === null) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return <>{children}</>;
}
