'use client';

import { useProfileContext } from '../_context';
import { AccessSection, DangerZone } from '../_components';

export default function PerfilAcessoPage() {
  const { user } = useProfileContext();
  return (
    <div className="flex flex-col gap-5">
      <AccessSection email={user.email ?? ''} providerData={user.providerData} />
      <DangerZone />
    </div>
  );
}
