'use client';

import { useEffect, useMemo, useState } from 'react';
import { admissionSearchService, AdmissionSearchRow } from '@/app/services/admissionSearchService';
import AdmissionVisitDetailModal from '@/app/components/admission/AdmissionVisitDetailModal';
import PatientFolderVisitsModal from '@/app/components/admission/PatientFolderVisitsModal';
import {
	VisitClinicalBadges,
	clinicalBadgeToTab,
	type ClinicalBadgeKind,
} from '@/app/components/admission/AdmissionSearchClinicalBadges';
import { useAdmissionVisitDetail } from '@/app/hooks/useAdmissionVisitDetail';
import styles from './search.module.css';
import sharedStyles from '../tables/tables.module.css';
import {
  type AdmissionPeriodo,
  formatDMY,
  rangoDesdePeriodo,
} from '@/app/utils/admissionDatePeriod';
import { groupRowsByPatient } from '@/app/utils/admissionSearchUtils';

const initialFilters = {
  dni: '',
  nombreApellido: '',
  fechaInicio: '',
  fechaFin: '',
};

function tipoAtencion(row: AdmissionSearchRow): string {
  const s = String(row.TipoAtencion || '').trim();
  if (s) return s;
  const d = String(row.TipoPacienteDescripcion || row.EstadoAmbulatorioDescripcion || '').trim();
  return d || 'Sin clasificar';
}

function tipoAtencionClass(row: AdmissionSearchRow): string {
  const t = tipoAtencion(row).toLowerCase();
  if (t.includes('ambul')) return styles.typeAmbulatorio;
  if (t.includes('intern')) return styles.typeInternado;
  return styles.typeUnknown;
}

export default function AdmissionSearchPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [periodoActivo, setPeriodoActivo] = useState<AdmissionPeriodo | null>(null);
  const [rows, setRows] = useState<AdmissionSearchRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'admisiones' | 'pacientes'>('admisiones');
  const [folderModal, setFolderModal] = useState<{
    patient: AdmissionSearchRow;
    visits: AdmissionSearchRow[];
  } | null>(null);

  const {
    selectedVisit,
    detailData,
    loadingDetail,
    detailModalOpen,
    detailInitialTab,
    openVisitDetail,
    closeVisitDetail,
    reloadVisitDetail,
  } = useAdmissionVisitDetail();

  const runSearch = async (targetPage = 1) => {
    try {
      setLoading(true);
      setError('');
      const response = await admissionSearchService.buscar({
        ...filters,
        page: targetPage,
        limit: 25,
      });
      setRows(response.data || []);
      setPage(response.pagination?.page || targetPage);
      setTotalPages(response.pagination?.totalPages || 0);
      setTotal(response.pagination?.total || 0);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message || err?.message || 'Error al buscar admisiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch(1);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(1);
  };

  const aplicarPeriodo = (p: AdmissionPeriodo) => {
    const { fechaInicio, fechaFin } = rangoDesdePeriodo(p);
    setPeriodoActivo(p);
    setFilters((f) => ({ ...f, fechaInicio, fechaFin }));
  };

  const togglePeriodo = (p: AdmissionPeriodo) => {
    if (periodoActivo === p) {
      setPeriodoActivo(null);
      setFilters((f) => ({ ...f, fechaInicio: '', fechaFin: '' }));
    } else {
      aplicarPeriodo(p);
    }
  };

  const onClear = async () => {
    setPeriodoActivo(null);
    setFilters(initialFilters);
    setError('');
    closeVisitDetail();
    setFolderModal(null);
    await runSearch(1);
  };

  const groupedByPatient = useMemo(() => groupRowsByPatient(rows), [rows]);

  const handleBadgeClick = (kind: ClinicalBadgeKind, numeroVisita: number) => {
    void openVisitDetail(numeroVisita, clinicalBadgeToTab(kind));
  };

  const filtrosActivos = useMemo(() => {
    const out: string[] = [];
    if (filters.dni.trim()) out.push(`DNI: ${filters.dni.trim()}`);
    if (filters.nombreApellido.trim()) out.push(`Paciente: ${filters.nombreApellido.trim()}`);
    if (filters.fechaInicio || filters.fechaFin) {
      out.push(`Rango: ${formatDMY(filters.fechaInicio || '') || '—'} — ${formatDMY(filters.fechaFin || '') || '—'}`);
    }
    return out;
  }, [filters]);

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.pageIntro}>
          <h1 className={styles.pageTitle}>Búsqueda de admisiones</h1>
          <p className={styles.pageSubtitle}>
            Consultá por visita o abrí la carpeta del paciente con sus admisiones ordenadas de la más reciente a la más antigua.
          </p>
        </div>
        <div className={styles.pageKpis}>
          <article className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Resultados</span>
            <strong className={styles.kpiValue}>{total}</strong>
          </article>
          <article className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Vista</span>
            <strong className={styles.kpiValue}>
              {viewMode === 'admisiones' ? 'Por visita' : 'Carpeta de paciente'}
            </strong>
          </article>
        </div>
      </div>

      <form className={styles.searchPanel} onSubmit={onSubmit}>
        <div className={styles.searchPanelHead}>
          <h2 className={styles.panelTitle}>Filtros</h2>
          <span className={styles.panelSubtitle}>Podés buscar globalmente sin filtros o acotar por DNI, paciente y período.</span>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.modeToggle} role="group" aria-label="Modo de vista">
            <button
              type="button"
              className={`${styles.modeBtn} ${viewMode === 'admisiones' ? styles.modeBtnActive : ''}`}
              onClick={() => setViewMode('admisiones')}
            >
              Por visita
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${viewMode === 'pacientes' ? styles.modeBtnActive : ''}`}
              onClick={() => setViewMode('pacientes')}
            >
              Carpeta de paciente
            </button>
          </div>

          <label className={styles.inlineField}>
            <span>DNI</span>
            <input
              value={filters.dni}
              onChange={(e) => setFilters((f) => ({ ...f, dni: e.target.value }))}
              placeholder="Ej: 32123456"
            />
          </label>

          <label className={styles.inlineFieldWide}>
            <span>Nombre y apellido</span>
            <input
              value={filters.nombreApellido}
              onChange={(e) => setFilters((f) => ({ ...f, nombreApellido: e.target.value }))}
              placeholder="Ej: Pérez Juan"
            />
          </label>

          <div className={styles.periodoInline}>
            <span className={styles.periodoInlineLabel}>Período</span>
            <div className={styles.periodoChips} role="group" aria-label="Filtrar por semana, mes o año">
              <button
                type="button"
                className={`${styles.periodoBtn} ${periodoActivo === 'semana' ? styles.periodoBtnActive : ''}`}
                aria-pressed={periodoActivo === 'semana'}
                onClick={() => togglePeriodo('semana')}
              >
                Semana
              </button>
              <button
                type="button"
                className={`${styles.periodoBtn} ${periodoActivo === 'mes' ? styles.periodoBtnActive : ''}`}
                aria-pressed={periodoActivo === 'mes'}
                onClick={() => togglePeriodo('mes')}
              >
                Mes
              </button>
              <button
                type="button"
                className={`${styles.periodoBtn} ${periodoActivo === 'ano' ? styles.periodoBtnActive : ''}`}
                aria-pressed={periodoActivo === 'ano'}
                onClick={() => togglePeriodo('ano')}
              >
                Año
              </button>
            </div>
          </div>

          <div className={styles.toolbarActions}>
            <button type="submit" className={styles.actionPrimary} disabled={loading}>
              {loading ? 'Buscando…' : 'Buscar'}
            </button>
            <button type="button" className={styles.actionSecondary} onClick={onClear} disabled={loading}>
              Limpiar
            </button>
          </div>
        </div>
        <div className={styles.searchPanelFooter}>
          <p className={styles.periodHint}>
            {filters.fechaInicio && filters.fechaFin ? (
              <>
                Rango activo: {formatDMY(filters.fechaInicio)} — {formatDMY(filters.fechaFin)}
              </>
            ) : (
              <>Elegí semana, mes o año en Período (clic otra vez para quitar).</>
            )}
          </p>
          <div className={styles.filterChips}>
            {filtrosActivos.length === 0 ? (
              <span className={styles.filterChipMuted}>Sin filtros activos</span>
            ) : (
              filtrosActivos.map((txt) => (
                <span key={txt} className={styles.filterChip}>
                  {txt}
                </span>
              ))
            )}
          </div>
        </div>
      </form>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.resultsHeader}>
        <div className={styles.summary}>
          <strong>{total}</strong> resultados
        </div>
        <div className={styles.summaryMeta}>
          Página {page} de {Math.max(1, totalPages)}
        </div>
      </div>

      <section className={styles.resultsPanel}>
        {viewMode === 'admisiones' ? (
          <div className={styles.admisionesResult}>
            <div className={sharedStyles.tableContainer}>
            <table className={sharedStyles.table}>
              <thead>
                <tr>
                  <th>Numero visita</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>DNI</th>
                  <th>HC</th>
                  <th>Información clínica</th>
                  <th>Fecha admision</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.empty}>
                      {loading ? 'Buscando...' : 'Sin resultados'}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.NumeroVisita}>
                      <td>
                        <button type="button" className={styles.linkButton} onClick={() => openVisitDetail(row.NumeroVisita)}>
                          {row.NumeroVisita}
                        </button>
                      </td>
                      <td>{row.ApellidoYNombre}</td>
                      <td>
                        <span className={`${styles.typeBadge} ${tipoAtencionClass(row)}`}>{tipoAtencion(row)}</span>
                      </td>
                      <td>{row.NumeroDocumento || '-'}</td>
                      <td>{row.NumeroHC || '-'}</td>
                      <td>
                        <VisitClinicalBadges row={row} onBadgeClick={handleBadgeClick} />
                      </td>
                      <td>{row.FechaAdmision || '-'}</td>
                      <td>{row.HoraAdmision || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>

            <div className={styles.admissionCards} aria-live="polite">
              {rows.length === 0 ? (
                <div className={styles.mobileEmpty}>{loading ? 'Buscando...' : 'Sin resultados'}</div>
              ) : (
                rows.map((row) => (
                  <article key={`card-${row.NumeroVisita}`} className={styles.admissionCard}>
                    <div className={styles.admissionCardHead}>
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => openVisitDetail(row.NumeroVisita)}
                      >
                        Visita #{row.NumeroVisita}
                      </button>
                      <span className={styles.admissionCardDate}>
                        {row.FechaAdmision || '-'} {row.HoraAdmision || '-'}
                      </span>
                    </div>
                    <p className={styles.admissionCardPatient}>{row.ApellidoYNombre}</p>
                    <p className={styles.admissionCardMeta}>
                      DNI {row.NumeroDocumento || '—'} · HC {row.NumeroHC || '—'}
                    </p>
                    <p className={styles.admissionCardMeta}>
                      <span className={`${styles.typeBadge} ${tipoAtencionClass(row)}`}>{tipoAtencion(row)}</span>
                    </p>
                    <VisitClinicalBadges row={row} onBadgeClick={handleBadgeClick} />
                  </article>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className={styles.patientFolders}>
            {groupedByPatient.length === 0 ? (
              <div className={sharedStyles.noResults}>{loading ? 'Buscando...' : 'Sin resultados'}</div>
            ) : (
              groupedByPatient.map(({ patient, visits }) => (
                <button
                  key={patient.IdPaciente}
                  type="button"
                  className={styles.folderCard}
                  onClick={() => setFolderModal({ patient, visits })}
                >
                  <div className={styles.folderCardInner}>
                    <div className={styles.folderAccent} aria-hidden />
                    <div className={styles.folderMain}>
                      <span className={styles.folderIcon} aria-hidden>
                        <svg width="22" height="18" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M2 6.5C2 5.12 3.12 4 4.5 4H9.17L11 6H19.5C20.88 6 22 7.12 22 8.5V15.5C22 16.88 20.88 18 19.5 18H4.5C3.12 18 2 16.88 2 15.5V6.5Z"
                            fill="#00b5e2"
                            fillOpacity="0.2"
                            stroke="#0083a9"
                            strokeWidth="1.2"
                          />
                        </svg>
                      </span>
                      <div className={styles.folderTitleBlock}>
                        <span className={styles.folderPatientName}>{patient.ApellidoYNombre}</span>
                        <span className={styles.folderPatientDni}>
                          DNI {patient.NumeroDocumento || '—'} · HC {patient.NumeroHC || '—'}
                        </span>
                        {visits[0] ? (
                          <span className={styles.folderLastVisit}>
                            Última visita: {visits[0].FechaAdmision || '—'} {visits[0].HoraAdmision || ''}
                          </span>
                        ) : null}
                      </div>
                      <span className={styles.folderVisitCount}>
                        {visits.length} {visits.length === 1 ? 'visita' : 'visitas'}
                      </span>
                      <span className={styles.folderOpenHint}>Abrir</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </section>

      <div className={styles.pagination}>
        <button type="button" onClick={() => runSearch(page - 1)} disabled={loading || page <= 1}>
          Anterior
        </button>
        <span>
          Pagina {page} de {Math.max(1, totalPages)}
        </span>
        <button type="button" onClick={() => runSearch(page + 1)} disabled={loading || page >= totalPages}>
          Siguiente
        </button>
      </div>

      <PatientFolderVisitsModal
        isOpen={folderModal != null}
        onClose={() => setFolderModal(null)}
        patient={folderModal?.patient ?? null}
        visits={folderModal?.visits ?? []}
      />

      <AdmissionVisitDetailModal
        isOpen={detailModalOpen}
        onClose={closeVisitDetail}
        numeroVisita={selectedVisit}
        loading={loadingDetail}
        data={detailData}
        initialTab={detailInitialTab}
        onReloadData={() => void reloadVisitDetail()}
      />
    </div>
  );
}
