'use client';

import { useConfigurarContext } from '../_context';
import { VisibilidadeTab } from '../_components';

export default function ConfigurarVisibilidadePage() {
  const { klub, onKlubUpdated } = useConfigurarContext();
  return <VisibilidadeTab klub={klub} onUpdated={onKlubUpdated} />;
}
