'use client';

import { useProfileContext } from './_context';
import { IdentitySection } from './_components';

export default function PerfilIdentidadePage() {
  const { me, onMeUpdated } = useProfileContext();
  return <IdentitySection initial={me} onUpdated={onMeUpdated} />;
}
