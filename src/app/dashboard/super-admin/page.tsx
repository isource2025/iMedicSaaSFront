'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PanelEjecutivo from '@/app/components/SuperAdmin/PanelEjecutivo';
import Loader from '@/app/components/Loader/Loader';

const TAB_REDIRECT: Record<string, string> = {
  empresas: '/dashboard/super-admin/empresas',
  editar: '/dashboard/super-admin/empresas',
  onboarding: '/dashboard/super-admin/alta',
  usuarios: '/dashboard/super-admin/usuarios',
  configuracion: '/dashboard/super-admin/configuracion',
  seguridad: '/dashboard/super-admin/seguridad',
  analitica: '/dashboard/super-admin/analitica',
};

function LegacyTabRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get('tab');

  useEffect(() => {
    if (tab && TAB_REDIRECT[tab]) router.replace(TAB_REDIRECT[tab]);
  }, [tab, router]);

  return <PanelEjecutivo />;
}

export default function SuperAdminPanelPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LegacyTabRedirect />
    </Suspense>
  );
}
