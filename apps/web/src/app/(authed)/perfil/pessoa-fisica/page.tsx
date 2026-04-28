'use client';

import { useProfileContext } from '../_context';
import { PessoaFisicaSection } from '../_components';

export default function PerfilPessoaFisicaPage() {
  const { me, onMeUpdated } = useProfileContext();
  return <PessoaFisicaSection initial={me} onUpdated={onMeUpdated} />;
}
