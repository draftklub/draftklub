'use client';

import { Banner } from '@/components/ui/banner';
import { useConfigurarContext } from '../_context';
import { EquipeTab } from '../_components';

export default function ConfigurarEquipePage() {
  const { klub, isKlubAdmin, canTransferAdmin } = useConfigurarContext();

  if (!isKlubAdmin) {
    return (
      <Banner tone="warning" title="Acesso restrito">
        Apenas KLUB_ADMIN, KLUB_ASSISTANT ou Platform-level acessam Equipe.
      </Banner>
    );
  }

  return <EquipeTab klub={klub} canTransferAdmin={canTransferAdmin} />;
}
