'use client';

import { Banner } from '@/components/ui/banner';
import { useConfigurarContext } from '../_context';
import { PerigosaTab } from '../_components';

export default function ConfigurarPerigosaPage() {
  const { klub, isPlatform, onDeactivated } = useConfigurarContext();

  if (!isPlatform) {
    return (
      <Banner tone="warning" title="Acesso restrito">
        Apenas Platform-level (Owner/Admin) pode desativar Klub.
      </Banner>
    );
  }

  return <PerigosaTab klub={klub} onDeactivated={onDeactivated} />;
}
