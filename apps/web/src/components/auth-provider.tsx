'use client';

import * as React from 'react';
import { subscribeToAuthState, type FirebaseUser } from '@/lib/auth';

interface AuthContextValue {
  /** User Firebase atual. `null` quando não logado. */
  user: FirebaseUser | null;
  /**
   * `true` enquanto o primeiro `onAuthStateChanged` ainda não resolveu
   * (refresh inicial do token). Use pra evitar flicker em rotas
   * protegidas.
   */
  loading: boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

/**
 * Subscreve `onAuthStateChanged` no mount e mantém `user` em estado.
 * Coloque no `app/layout.tsx` (raiz) — é o único componente que precisa
 * desse listener.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<FirebaseUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsub = subscribeToAuthState((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

/**
 * Hook pra ler o estado de auth atual. Lança se usado fora do
 * `AuthProvider`.
 */
export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
