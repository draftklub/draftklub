import Link from 'next/link';
import { Compass } from 'lucide-react';

/**
 * Sprint M batch SM-5 — 404 customizado pra rotas inválidas.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Compass className="size-6" />
        </div>
        <h1 className="font-display text-2xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esse caminho não existe — ou foi removido. Volta pra home pra continuar de onde parou.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/home"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar pra home
          </Link>
          <Link
            href="/buscar-klubs"
            className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Buscar Klubs
          </Link>
        </div>
      </div>
    </main>
  );
}
