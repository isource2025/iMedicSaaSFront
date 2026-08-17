'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermiso } from '@/app/hooks/usePermiso';
import Loader from '../Loader/Loader';
import styles from './superAdmin.module.css';

export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { rol, loaded, permisos } = usePermiso();
  const puedeAcceder = loaded && (rol?.nombre === 'SUPER_ADMIN' || permisos.includes('PLATAFORMA.PANEL.VER'));

  useEffect(() => {
    if (!loaded) return;
    if (!puedeAcceder) router.replace('/dashboard');
  }, [loaded, puedeAcceder, router]);

  if (!loaded || !puedeAcceder) {
    return (
      <div className={styles.superAdmin}>
        <Loader />
      </div>
    );
  }

  return <>{children}</>;
}
