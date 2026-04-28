'use client';

import { useConfigurarContext } from './_context';
import { IdentidadeTab } from './_components';

export default function ConfigurarIdentidadePage() {
  const { klub, onKlubUpdated } = useConfigurarContext();
  return <IdentidadeTab klub={klub} onUpdated={onKlubUpdated} />;
}
