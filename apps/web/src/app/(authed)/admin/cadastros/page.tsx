import { redirect } from 'next/navigation';

/**
 * Sprint Polish PR-I1 — `/admin/cadastros` foi renomeado pra
 * `/admin/aprovacoes` (mais descritivo do que a página faz).
 * Mantemos esse stub pra preservar bookmarks antigos.
 */
export default function CadastrosRedirect() {
  redirect('/admin/aprovacoes');
}
