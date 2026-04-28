import { redirect } from 'next/navigation';

/**
 * Sprint Polish PR-I2 — wizard onboarding mergeado em `/configurar`.
 * Quem quiser sequência guiada vê tab Modalidades primeiro, depois Quadras.
 */
export default async function OnboardingRedirect({
  params,
}: {
  params: Promise<{ klubSlug: string }>;
}) {
  const { klubSlug } = await params;
  redirect(`/k/${klubSlug}/configurar?tab=modalidades`);
}
