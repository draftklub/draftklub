'use client';

/**
 * Sprint L PR-L3 — barrel de re-exports do /configurar.
 *
 * Cada tab foi extraída pro seu próprio arquivo (Sprint O batch O-7).
 * Este arquivo mantém a API pública estável — consumers continuam
 * importando de './_components' sem precisar saber do arquivo de destino.
 *
 * - Tabs básicas → ./_tabs-basicas.tsx  (O-7, ~380 linhas)
 * - EquipeTab    → ./_equipe.tsx        (O-7, ~418 linhas)
 * - ModalidadesTab → ./_modalidades.tsx (O-7, ~111 linhas)
 * - QuadrasTab   → ./_quadras.tsx       (O-7, ~417 linhas)
 * - Form helpers → ./_form-helpers.tsx  (O-7, ~166 linhas)
 */

export {
  ContatoTab,
  IdentidadeTab,
  LegalTab,
  LocalizacaoTab,
  PerigosaTab,
  VisibilidadeTab,
} from './_tabs-basicas';
export { EquipeTab } from './_equipe';
export { ModalidadesTab } from './_modalidades';
export { QuadrasTab } from './_quadras';
