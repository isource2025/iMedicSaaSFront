'use client';

import type { EmpresaAdmin, EmpresaChecklist } from '@/app/types/superAdmin';
import { estadoBadgeClass, tipoServidorLabel } from '../ui/status';
import styles from '../superAdmin.module.css';

type Props = {
  empresa: EmpresaAdmin;
  checklist: EmpresaChecklist | null;
  busy?: boolean;
  onActivar: () => void;
  onSuspender: () => void;
  onEliminar: () => void;
};

export default function EmpresaHeader({ empresa, checklist, busy, onActivar, onSuspender, onEliminar }: Props) {
  const estado = empresa.suscripcion?.estado || 'PRUEBA';
  const puedeActivar = checklist?.listaParaActivar || estado === 'PRUEBA' || estado === 'SUSPENDIDA';
  const puedeSuspender = estado === 'ACTIVA' || estado === 'PRUEBA';

  return (
    <div className={styles.workspaceHeader}>
      <div>
        <h2 className={styles.workspaceTitle}>{empresa.descripcion}</h2>
        <div className={styles.workspaceBadges}>
          <span className={`${styles.badge} ${styles.badgeMuted}`}>{tipoServidorLabel(empresa.tipoServidor)}</span>
          <span className={`${styles.badge} ${styles.badgeMuted}`}>{empresa.suscripcion?.plan || '—'}</span>
          <span className={`${styles.badge} ${estadoBadgeClass(estado)}`}>{estado}</span>
          {checklist?.motivoAtencion && (
            <span className={`${styles.badge} ${styles.badgeWarn}`}>{checklist.motivoAtencion}</span>
          )}
        </div>
      </div>
      <div className={styles.headerActions}>
        {puedeActivar && estado !== 'ACTIVA' && (
          <button type="button" className={styles.btn} onClick={onActivar} disabled={busy}>
            Activar
          </button>
        )}
        {puedeSuspender && (
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onSuspender} disabled={busy}>
            Suspender
          </button>
        )}
        <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={onEliminar} disabled={busy}>
          Eliminar
        </button>
      </div>
    </div>
  );
}
