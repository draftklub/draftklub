'use client';

import { useConfigurarContext } from '../_context';
import { LocalizacaoTab } from '../_components';

export default function ConfigurarLocalizacaoPage() {
  const { klub, onKlubUpdated } = useConfigurarContext();
  return <LocalizacaoTab klub={klub} onUpdated={onKlubUpdated} />;
}
