'use client';

/**
 * Sprint L PR-L2 — barrel de re-exports do tournament detail.
 *
 * Cada view foi extraída pro seu próprio arquivo (Sprint O batches O-3..O-5).
 * Este arquivo mantém a API pública estável — consumers continuam importando
 * de '../_components' sem precisar saber do arquivo de destino.
 *
 * - BracketView   → ./_bracket.tsx  (O-4, 1320 linhas)
 * - EntriesView   → ./_entries.tsx  (O-3,  491 linhas)
 * - OperacoesView → ./_operacoes.tsx (O-5, 1038 linhas)
 */

export { BracketView } from './_bracket';
export { EntriesView } from './_entries';
export { OperacoesView } from './_operacoes';
