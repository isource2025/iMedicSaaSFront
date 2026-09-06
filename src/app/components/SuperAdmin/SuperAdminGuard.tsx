'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermiso } from '@/app/hooks/usePermiso';
import { authService } from '@/app/services/authService';
import Loader from '../Loader/Loader';
import styles from './superAdmin.module.css';

export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { rol, loaded, permisos } = usePermiso();
  const puedeAcceder = loaded && (rol?.nombre === 'SUPER_ADMIN' || permisos.includes('PLATAFORMA.PANEL.VER'));

  useEffect(() => {
    if (!loaded) return;
    if (!puedeAcceder) router.replace(authService.getHomePath(rol?.nombre));
  }, [loaded, puedeAcceder, rol?.nombre, router]);

  if (!loaded || !puedeAcceder) {
    return (
      <div className={styles.superAdmin}>
        <Loader />
      </div>
    );
  }

  return <>{children}</>;
}
