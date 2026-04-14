'use client';

import NotificationsFab from '@/app/components/layout/NotificationsFab';
import styles from './BedFloatingActions.module.css';

interface BedFloatingActionsProps {
  onOpenAdjuntos: () => void;
}

/**
 * Pila flotante en detalle de cama: abajo notificaciones, encima adjuntos (nuevos botones se apilan hacia arriba).
 */
export default function BedFloatingActions({ onOpenAdjuntos }: BedFloatingActionsProps) {
  return (
    <div className={styles.root} aria-label="Acciones rápidas">
      <NotificationsFab stack />
      <button
        type="button"
        className={styles.fabAdjuntos}
        onClick={onOpenAdjuntos}
        title="Archivos adjuntos"
        aria-label="Abrir archivos adjuntos"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
    </div>
  );
}
