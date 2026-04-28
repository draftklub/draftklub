'use client';

import { useProfileContext } from '../_context';
import { NotificacoesSection } from '../_components';

export default function PerfilNotificacoesPage() {
  const { me, onMeUpdated } = useProfileContext();
  return <NotificacoesSection initial={me} onUpdated={onMeUpdated} />;
}
