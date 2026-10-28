'use client';

import FloatingActionsRail from '@/app/components/layout/FloatingActionsRail';
import railStyles from '@/app/components/layout/FloatingActionsRail.module.css';
import NotificationsFab from '@/app/components/layout/NotificationsFab';
import PatientFolderFab from '@/app/components/layout/PatientFolderFab';
import { usePermiso } from '@/app/hooks/usePermiso';
import AsistenteFab from '@/app/components/Asistente/AsistenteFab';
import { useRegistrarRailLocal } from '@/app/components/layout/railLocalStore';
import { useBedDetail } from './contexts/BedDetailContext';
import styles from './BedFloatingActions.module.css';

interface BedFloatingActionsProps {
  onOpenAdjuntos: () => void;
  onOpenNursing: () => void;
  onOpenLaboratorios: () => void;
}

/**
 * Acciones rápidas en detalle de cama (según permisos del usuario).
 * El enfermero también tiene Evoluciones e Interconsultas (mismas secciones
 * que en Gestión Médica; las abre en el cuerpo de la ficha).
 */
export default function BedFloatingActions({
  onOpenAdjuntos,
  onOpenNursing,
  onOpenLaboratorios,
}: BedFloatingActionsProps) {
  useRegistrarRailLocal();
  const { puede, loaded } = usePermiso();
  const { navigateToSection, activeSection } = useBedDetail();
  const asistente = <AsistenteFab stack />;
  const modoEnfermeria =
    loaded &&
    (puede('INTERNACION.INDICACIONES.APLICAR') ||
      puede('INTERNACION.INDICACIONES.MARCAR_VISTO')) &&
    !puede('INTERNACION.EVOLUCIONES.CREAR');
  const showAdjuntos = puede('INTERNACION.ADJUNTOS.VER') || puede('INTERNACION.ADJUNTOS.CREAR');
  const showLabs = puede('INTERNACION.ESTUDIOS.VER') || puede('INTERNACION.ESTUDIOS.CREAR');
  const showNursing =
    puede('INTERNACION.EVOLUCION_ENFERMERIA.VER') ||
    puede('INTERNACION.EVOLUCION_ENFERMERIA.CREAR') ||
    puede('INTERNACION.SIGNOS_VITALES.VER') ||
    puede('INTERNACION.SIGNOS_VITALES.CREAR');
  const showEvoluciones = modoEnfermeria && puede('INTERNACION.EVOLUCIONES.VER');
  const showInterconsulta = modoEnfermeria && puede('INTERNACION.INTERCONSULTAS.VER');

  if (!showAdjuntos && !showLabs && !showNursing && !showEvoluciones && !showInterconsulta) {
    return (
      <FloatingActionsRail ariaLabel="Acciones rápidas" className={styles.root} overModals footer={asistente}>
        <NotificationsFab stack />
        <PatientFolderFab stack />
      </FloatingActionsRail>
    );
  }

  return (
    <FloatingActionsRail ariaLabel="Acciones rápidas" className={styles.root} overModals footer={asistente}>
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
      {showEvoluciones && (
      <button
        type="button"
        className={`${railStyles.item} ${styles.fabEvoluciones} ${activeSection === 'evoluciones' ? railStyles.itemActive : ''}`}
        onClick={() => navigateToSection('evoluciones')}
        title="Evoluciones"
        aria-label="Abrir evoluciones"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      </button>
      )}
      {showInterconsulta && (
      <button
        type="button"
        className={`${railStyles.item} ${styles.fabInterconsulta} ${activeSection === 'interconsulta' ? railStyles.itemActive : ''}`}
        onClick={() => navigateToSection('interconsulta')}
        title="Interconsultas"
        aria-label="Abrir interconsultas"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
