'use client';

import SuperAdminSeguridadPanel from '@/app/components/SuperAdmin/SuperAdminSeguridadPanel';
import SuperAdminShell from '@/app/components/SuperAdmin/SuperAdminShell';

export default function SuperAdminSeguridadPage() {
  return (
    <SuperAdminShell
      title="Seguridad"
      subtitle="Sesión inactiva y geo-bloqueo de la plataforma"
      crumbs={[
        { label: 'Plataforma', href: '/dashboard/super-admin' },
        { label: 'Seguridad' },
      ]}
    >
      <SuperAdminSeguridadPanel />
    </SuperAdminShell>
  );
}
