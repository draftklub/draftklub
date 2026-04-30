import { PerfilLayoutClient } from './layout.client';

export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  return <PerfilLayoutClient>{children}</PerfilLayoutClient>;
}
