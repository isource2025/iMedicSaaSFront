'use client';

import FloatingActionsRail from '@/app/components/layout/FloatingActionsRail';
import railStyles from '@/app/components/layout/FloatingActionsRail.module.css';
import NotificationsFab from '@/app/components/layout/NotificationsFab';
import PatientFolderFab from '@/app/components/layout/PatientFolderFab';
import { usePermiso } from '@/app/hooks/usePermiso';
import styles from './BedFloatingActions.module.css';

interface BedFloatingActionsProps {
  onOpenAdjuntos: () => void;
  onOpenNursing: () => void;
  onOpenLaboratorios: () => void;
}

/**
 * Acciones rápidas en detalle de cama (según permisos del usuario).
 */
export default function BedFloatingActions({
  onOpenAdjuntos,
  onOpenNursing,
  onOpenLaboratorios,
}: BedFloatingActionsProps) {
  const { puede } = usePermiso();
  const showAdjuntos = puede('INTERNACION.ADJUNTOS.VER') || puede('INTERNACION.ADJUNTOS.CREAR');
  const showLabs = puede('INTERNACION.ESTUDIOS.VER') || puede('INTERNACION.ESTUDIOS.CREAR');
  const showNursing =
    puede('INTERNACION.EVOLUCION_ENFERMERIA.VER') ||
    puede('INTERNACION.EVOLUCION_ENFERMERIA.CREAR') ||
    puede('INTERNACION.SIGNOS_VITALES.VER') ||
    puede('INTERNACION.SIGNOS_VITALES.CREAR');

  if (!showAdjuntos && !showLabs && !showNursing) {
    return (
      <FloatingActionsRail ariaLabel="Acciones rápidas" className={styles.root} overModals>
        <NotificationsFab stack />
        <PatientFolderFab stack />
      </FloatingActionsRail>
    );
  }

  return (
    <FloatingActionsRail ariaLabel="Acciones rápidas" className={styles.root} overModals>
      <NotificationsFab stack />
      <PatientFolderFab stack />
      {showNursing && (
      <button
        type="button"
        className={`${railStyles.item} ${styles.fabEnfermeria}`}
        onClick={onOpenNursing}
        title="Reporte de enfermería"
        aria-label="Abrir reporte de enfermería"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 2h6v4h4v16H5V6h4z" />
          <path d="M9 6h6" />
          <path d="M9 11h6" />
          <path d="M9 15h4" />
        </svg>
      </button>
      )}
      {showLabs && (
      <button
        type="button"
        className={`${railStyles.item} ${styles.fabLaboratorio}`}
        onClick={onOpenLaboratorios}
        title="Resultados de laboratorio"
        aria-label="Abrir resultados de laboratorio"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10 2v6l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-9V2" />
          <path d="M8 2h8" />
          <path d="M7.5 16h9" />
        </svg>
      </button>
      )}
      {showAdjuntos && (
      <button
        type="button"
        className={`${railStyles.item} ${styles.fabAdjuntos}`}
        onClick={onOpenAdjuntos}
        title="Archivos adjuntos"
        aria-label="Abrir archivos adjuntos"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
      )}
    </FloatingActionsRail>
  );
}
