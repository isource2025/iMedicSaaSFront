'use client';

import { useCallback, useEffect, useState } from 'react';
import Modal from '@/app/components/UI/Modal';
import { admissionSearchService } from '@/app/services/admissionSearchService';
import type { AdmissionSearchRow } from '@/app/services/admissionSearchService';
import AdmissionVisitDetailContent from './AdmissionVisitDetailContent';
import type { VisitDetailPayload, VisitDetailTabId } from './AdmissionVisitDetailModal';
import {
  VisitClinicalBadges,
  clinicalBadgeToTab,
  type ClinicalBadgeKind,
} from './AdmissionSearchClinicalBadges';
import styles from './PatientFolderVisitsModal.module.css';

interface PatientFolderVisitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: AdmissionSearchRow | null;
  visits: AdmissionSearchRow[];
}

export default function PatientFolderVisitsModal({
  isOpen,
  onClose,
  patient,
  visits,
}: PatientFolderVisitsModalProps) {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [detailVisit, setDetailVisit] = useState<number | null>(null);
  const [detailSection, setDetailSection] = useState<VisitDetailTabId | undefined>();
  const [detailData, setDetailData] = useState<VisitDetailPayload | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  const resetDetail = useCallback(() => {
    setView('list');
    setDetailVisit(null);
    setDetailSection(undefined);
    setDetailData(null);
    setLoadingDetail(false);
    setDetailError('');
  }, []);

  useEffect(() => {
    if (!isOpen) resetDetail();
  }, [isOpen, resetDetail]);

  const openDetail = useCallback(async (numeroVisita: number, section?: VisitDetailTabId) => {
    setView('detail');
    setDetailVisit(numeroVisita);
    setDetailSection(section);
    setDetailData(null);
    setDetailError('');
    try {
      setLoadingDetail(true);
      const data = await admissionSearchService.detalle(numeroVisita);
      setDetailData(data as VisitDetailPayload);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setDetailError(err?.response?.data?.message || err?.message || 'No se pudo cargar el detalle');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleBadgeClick = (kind: ClinicalBadgeKind, numeroVisita: number) => {
    void openDetail(numeroVisita, clinicalBadgeToTab(kind));
  };

  if (!patient) return null;

  const title =
    view === 'list'
      ? `Visitas — ${patient.ApellidoYNombre || 'Paciente'}`
      : `Visita #${detailVisit ?? ''}`;

  const tipoAtencion = (v: AdmissionSearchRow) => {
    const s = String(v.TipoAtencion || '').trim();
    if (s) return s;
    const d = String(v.TipoPacienteDescripcion || v.EstadoAmbulatorioDescripcion || '').trim();
    return d || 'Sin clasificar';
  };

  const tipoClass = (v: AdmissionSearchRow) => {
    const t = tipoAtencion(v).toLowerCase();
    if (t.includes('ambul')) return styles.typeAmbulatorio;
    if (t.includes('intern')) return styles.typeInternado;
    return styles.typeUnknown;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={view === 'detail' ? 'full' : 'large'}>
      {view === 'list' ? (
        <>
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
                    onClick={() => void openDetail(visit.NumeroVisita)}
                  >
                    Visita #{visit.NumeroVisita}
                  </button>
                  <span className={styles.visitDate}>
                    {visit.FechaAdmision || '—'} {visit.HoraAdmision || ''}
                  </span>
                </div>
                <div className={styles.visitMetaRow}>
                  <span className={`${styles.visitTypeBadge} ${tipoClass(visit)}`}>
                    {tipoAtencion(visit)}
                  </span>
                </div>
                <VisitClinicalBadges row={visit} onBadgeClick={handleBadgeClick} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.detailWrap}>
          {detailError ? <p className={styles.detailError}>{detailError}</p> : null}
          <AdmissionVisitDetailContent
            numeroVisita={detailVisit}
            loading={loadingDetail}
            data={detailData}
            initialSection={detailSection}
            onBack={resetDetail}
            backLabel="← Volver a visitas"
          />
        </div>
      )}
    </Modal>
  );
}
