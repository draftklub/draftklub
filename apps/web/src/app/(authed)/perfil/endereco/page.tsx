'use client';

import { useProfileContext } from '../_context';
import { EnderecoSection } from '../_components';

export default function PerfilEnderecoPage() {
  const { me, onMeUpdated } = useProfileContext();
  return <EnderecoSection initial={me} onUpdated={onMeUpdated} />;
}
