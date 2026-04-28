'use client';

import { useConfigurarContext } from '../_context';
import { QuadrasTab } from '../_components';

export default function ConfigurarQuadrasPage() {
  const { klub } = useConfigurarContext();
  return <QuadrasTab klub={klub} />;
}
