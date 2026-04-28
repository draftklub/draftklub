import { redirect } from 'next/navigation';

/**
 * Sprint Polish PR-I2 — `/quadras` virou tab dentro de `/configurar`.
 */
export default async function QuadrasRedirect({
  params,
}: {
  params: Promise<{ klubSlug: string }>;
}) {
  const { klubSlug } = await params;
  redirect(`/k/${klubSlug}/configurar?tab=quadras`);
}
