'use client';

import { useConfigurarContext } from '../_context';
import { ContatoTab } from '../_components';

export default function ConfigurarContatoPage() {
  const { klub, onKlubUpdated } = useConfigurarContext();
  return <ContatoTab klub={klub} onUpdated={onKlubUpdated} />;
}
