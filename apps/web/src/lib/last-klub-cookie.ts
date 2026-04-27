/**
 * Cookie helpers pra persistir o último Klub visitado.
 *
 * Lido pelo `/home` pra renderizar o card "Continue de onde parou"
 * apontando pro último Klub que o user esteve. Setado pelo
 * `ActiveKlubProvider` toda vez que um Klub resolve com sucesso.
 *
 * Escopo: client-side. Não tente ler em Server Components — esse cookie
 * é setado depois do client resolver o Klub no `ActiveKlubProvider`.
 */

const COOKIE_NAME = 'dk_last_klub_slug';
const MAX_AGE_DAYS = 30;

export function rememberLastKlubSlug(slug: string): void {
  if (typeof document === 'undefined') return;
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(slug)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function readLastKlubSlug(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.slice(COOKIE_NAME.length + 1);
  return value ? decodeURIComponent(value) : null;
}

export function forgetLastKlubSlug(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}
