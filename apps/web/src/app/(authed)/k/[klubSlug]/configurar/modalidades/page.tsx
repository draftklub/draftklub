'use client';

import { useConfigurarContext } from '../_context';
import { ModalidadesTab } from '../_components';

export default function ConfigurarModalidadesPage() {
  const { klub } = useConfigurarContext();
  return <ModalidadesTab klub={klub} />;
}
