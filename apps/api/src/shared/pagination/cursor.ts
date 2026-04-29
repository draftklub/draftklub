import { z } from 'zod';

/**
 * Sprint N batch 4 — cursor pagination helpers.
 *
 * Padrão escolhido: cursor opaco (base64 de JSON `{ id, ts? }`). Cliente
 * passa `?cursor=<opaque>&limit=N`, backend retorna `{ items, nextCursor
 * | null }`. Sem total count (caro em listas grandes — prefere "load
 * more" sobre paginação numerada).
 *
 * Ordering típico: descending por uma coluna timestamp + tiebreaker por
 * id (estável). O cursor carrega ambos pra cobrir empates.
 *
 * Vantagens vs offset-based:
 *  - Estável durante inserts/deletes concorrentes (offset salta rows)
 *  - Performance constante (offset=10000 faz seq scan)
 *  - Funciona bem com keyset pagination em Postgres
 */

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

/** Schema Zod pra `?cursor=&limit=`. Reusável em DTOs de query. */
export const CursorPaginationSchema = z.object({
  cursor: z.string().min(1).max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
});
export type CursorPaginationParams = z.infer<typeof CursorPaginationSchema>;

/**
 * Encoda payload de cursor (id + opcionais) em string opaca base64.
 * Usado pelo handler quando monta `nextCursor`.
 */
export function encodeCursor(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf8').toString('base64url');
}

/**
 * Decodifica cursor → objeto. Retorna null se inválido (cliente passou
 * lixo). Handler cai no caminho "começo da lista" sem erro.
 */
export function decodeCursor<T extends Record<string, unknown>>(cursor?: string): T | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

/** Shape canônico de response paginado. Aplicar em todos os endpoints novos. */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Helper: dado um array de items + limit, monta { items, nextCursor }.
 * Caller deve fetch limit+1 do banco e passar pra cá com função de
 * extração do cursor a partir do último item.
 */
export function buildCursorPage<T>(
  rowsPlusOne: T[],
  limit: number,
  cursorFromItem: (item: T) => Record<string, unknown>,
): CursorPage<T> {
  if (rowsPlusOne.length <= limit) {
    return { items: rowsPlusOne, nextCursor: null };
  }
  const items = rowsPlusOne.slice(0, limit);
  const last = items[items.length - 1];
  const nextCursor = last ? encodeCursor(cursorFromItem(last)) : null;
  return { items, nextCursor };
}
