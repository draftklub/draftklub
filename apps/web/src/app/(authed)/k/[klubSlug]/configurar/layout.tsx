import { ConfigurarLayoutClient } from './layout.client';

export default function ConfigurarLayout({ children }: { children: React.ReactNode }) {
  return <ConfigurarLayoutClient>{children}</ConfigurarLayoutClient>;
}
