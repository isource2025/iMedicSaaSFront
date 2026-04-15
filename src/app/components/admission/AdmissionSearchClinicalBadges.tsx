'use client';

import type { AdmissionSearchRow } from '@/app/services/admissionSearchService';
import styles from './AdmissionSearchClinicalBadges.module.css';

export function visitClinicalCount(row: AdmissionSearchRow, ...keys: string[]): number {
  const o = row as unknown as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const p = parseInt(v, 10);
      if (!Number.isNaN(p)) return p;
    }
  }
  return 0;
}

export function VisitClinicalBadges({ row }: { row: AdmissionSearchRow }) {
  const items = [
    { label: 'HCI', count: visitClinicalCount(row, 'CntHistoriaClinica', 'cntHistoriaClinica') },
    { label: 'Prác', count: visitClinicalCount(row, 'CntPracticas', 'cntPracticas') },
    { label: 'Ind', count: visitClinicalCount(row, 'CntIndicaciones', 'cntIndicaciones') },
    { label: 'Med', count: visitClinicalCount(row, 'CntMedicacion', 'cntMedicacion') },
    { label: 'Evo', count: visitClinicalCount(row, 'CntEvoluciones', 'cntEvoluciones') },
    { label: 'Est', count: visitClinicalCount(row, 'CntLaboratorios', 'cntLaboratorios') },
    { label: 'Prot', count: visitClinicalCount(row, 'CntProtocolos', 'cntProtocolos') },
    { label: 'Adj', count: visitClinicalCount(row, 'CntAdjuntos', 'cntAdjuntos') },
  ];
  return (
    <div className={styles.visitBadges} role="group" aria-label="Registros clínicos por tipo">
      {items.map(({ label, count }) => (
        <span
          key={label}
          className={`${styles.visitBadge} ${count === 0 ? styles.visitBadgeZero : ''}`}
          title={`${label}: ${count}`}
        >
          {label} · {count}
        </span>
      ))}
    </div>
  );
}
