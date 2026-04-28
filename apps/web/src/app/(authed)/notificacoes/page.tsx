'use client';

import { Bell } from 'lucide-react';

/**
 * Sprint Polish PR-H1 — placeholder. Backend ainda emite só emails via
 * Outbox; UI in-app de notificações fica pra sprint posterior (depende
 * de honrar `notificationPrefs` granular do User + adicionar `is_read`
 * em OutboxEvent ou tabela dedicada).
 */
export default function NotificacoesPage() {
  return (
    <main className="flex-1 overflow-y-auto px-4 py-10 md:px-6 md:py-14">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Bell className="size-6" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Notificações</h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground">
          Em breve! Por enquanto, mandamos avisos importantes (booking confirmado, lembrete 24h
          antes, solicitação de entrada) por <strong>email</strong>.
        </p>
        <p className="mt-3 text-[12px] text-muted-foreground">
          Ajusta as preferências em{' '}
          <a href="/perfil" className="text-primary hover:underline">
            perfil
          </a>
          .
        </p>
      </div>
    </main>
  );
}
