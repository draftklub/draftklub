/**
 * Sprint K PR-K5f — utilitário de formatação de datas com timezone do
 * Klub. Antes UI usava `toLocaleString('pt-BR')` que assume TZ do
 * browser; admin viajando ou usando VPN podia ver datas erradas.
 *
 * `formatInTz` aceita ISO 8601 UTC + IANA timezone (ex: America/Sao_Paulo)
 * e retorna string formatada na TZ desejada via `Intl.DateTimeFormat`.
 *
 * `klubTzLabel` formata pra mostrar perto de inputs ("hora local de Klub:
 * America/Sao_Paulo"). UX honest: usuário sabe que está digitando na TZ
 * do browser dele e que será convertido pra UTC. Klub vê na TZ dele.
 */

const DEFAULT_TZ = 'America/Sao_Paulo';

export interface FormatDateOptions {
  /** IANA tz; default 'America/Sao_Paulo'. */
  timezone?: string;
  /** Mostrar dia da semana (default false). */
  weekday?: boolean;
  /** Inclui ano (default true). */
  year?: boolean;
  /** Mostrar hora:minuto (default true). */
  showTime?: boolean;
}

export function formatInTz(iso: string | null | undefined, opts: FormatDateOptions = {}): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return '—';
    const tz = opts.timezone ?? DEFAULT_TZ;

    const intlOpts: Intl.DateTimeFormatOptions = {
      timeZone: tz,
      day: '2-digit',
      month: 'short',
    };
    if (opts.year !== false) intlOpts.year = 'numeric';
    if (opts.weekday) intlOpts.weekday = 'short';
    if (opts.showTime !== false) {
      intlOpts.hour = '2-digit';
      intlOpts.minute = '2-digit';
    }

    return new Intl.DateTimeFormat('pt-BR', intlOpts).format(date);
  } catch {
    return new Date(iso).toLocaleString('pt-BR');
  }
}

export function formatDateInTz(iso: string | null | undefined, timezone?: string): string {
  return formatInTz(iso, { timezone, showTime: false });
}

/**
 * Label curta pra mostrar em inputs datetime-local. UX explica que o user
 * digita na TZ do browser e o sistema converte pra UTC; Klub vê em sua TZ.
 */
export function klubTzLabel(timezone: string | null | undefined): string {
  return timezone ?? DEFAULT_TZ;
}

/**
 * Detecta se o browser está na mesma TZ do Klub. Útil pra decidir se mostra
 * warning de TZ mismatch.
 */
export function isBrowserInKlubTz(klubTimezone: string | null | undefined): boolean {
  if (!klubTimezone) return true; // sem klubTz, não há mismatch
  try {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return browserTz === klubTimezone;
  } catch {
    return true;
  }
}
