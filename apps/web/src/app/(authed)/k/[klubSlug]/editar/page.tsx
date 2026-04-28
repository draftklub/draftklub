import { redirect } from 'next/navigation';

/**
 * Sprint Polish PR-I2 — `/editar` mergeada em `/configurar`. Mantemos o stub
 * pra preservar bookmarks/links antigos.
 */
export default async function EditarRedirect({
  params,
}: {
  params: Promise<{ klubSlug: string }>;
}) {
  const { klubSlug } = await params;
  redirect(`/k/${klubSlug}/configurar`);
}
