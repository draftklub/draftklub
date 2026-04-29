'use client';

/**
 * Sprint L PR-L4 — barrel de re-exports do /perfil.
 *
 * Cada section foi extraída pro seu próprio arquivo (Sprint O batch O-8).
 * Este arquivo mantém a API pública estável — consumers continuam
 * importando de './_components' sem precisar saber do arquivo de destino.
 *
 * - IdentitySection    → ./_identidade.tsx      (O-8, ~328 linhas)
 * - PessoaFisica/End.  → ./_dados-pessoais.tsx  (O-8, ~372 linhas)
 * - Preferências/Notif → ./_preferencias.tsx    (O-8, ~212 linhas)
 * - AccessSection/etc  → ./_acesso.tsx          (O-8, ~304 linhas)
 * - Form primitives    → ./_primitivos.tsx       (O-8, ~144 linhas)
 */

export { IdentitySection } from './_identidade';
export { EnderecoSection, PessoaFisicaSection } from './_dados-pessoais';
export { NotificacoesSection, PreferenciasSection } from './_preferencias';
export { AccessSection, DangerZone } from './_acesso';
