'use client';

import { Banner } from '@/components/ui/banner';
import { useConfigurarContext } from '../_context';
import { LegalTab } from '../_components';

export default function ConfigurarLegalPage() {
  const { klub, onKlubUpdated, isPlatform } = useConfigurarContext();

  if (!isPlatform) {
    return (
      <Banner tone="warning" title="Acesso restrito">
        Apenas Platform-level (Owner/Admin) acessa Legal.
      </Banner>
    );
  }

  return <LegalTab klub={klub} onUpdated={onKlubUpdated} />;
}
