'use client';

import Modal from '@/app/components/UI/Modal';
import type { AdmissionSearchRow } from '@/app/services/admissionSearchService';
import { VisitClinicalBadges } from './AdmissionSearchClinicalBadges';
import styles from './PatientFolderVisitsModal.module.css';

interface PatientFolderVisitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: AdmissionSearchRow | null;
  visits: AdmissionSearchRow[];
  onOpenVisit: (numeroVisita: number) => void;
}

export default function PatientFolderVisitsModal({
  isOpen,
  onClose,
  patient,
  visits,
  onOpenVisit,
}: PatientFolderVisitsModalProps) {
  if (!patient) return null;

  const title = `Visitas — ${patient.ApellidoYNombre || 'Paciente'}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="large">
      <div className={styles.meta}>
        <span>
          DNI {patient.NumeroDocumento || '—'} · HC {patient.NumeroHC || '—'}
        </span>
        <span className={styles.count}>
          {visits.length} {visits.length === 1 ? 'visita' : 'visitas'}
        </span>
      </div>
      <div className={styles.list}>
        {visits.map((visit) => (
          <div key={visit.NumeroVisita} className={styles.visitCard}>
            <div className={styles.visitHead}>
              <button
                type="button"
                className={styles.visitLink}
                onClick={() => onOpenVisit(visit.NumeroVisita)}
              >
                Visita #{visit.NumeroVisita}
              </button>
              <span className={styles.visitDate}>
                {visit.FechaAdmision || '—'} {visit.HoraAdmision || ''}
              </span>
            </div>
            <VisitClinicalBadges row={visit} />
          </div>
        ))}
      </div>
    </Modal>
  );
}
