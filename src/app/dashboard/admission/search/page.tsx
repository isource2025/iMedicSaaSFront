'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { admissionSearchService, AdmissionSearchRow } from '@/app/services/admissionSearchService';
import AdmissionVisitDetailModal from '@/app/components/admission/AdmissionVisitDetailModal';
import PatientFolderVisitsModal from '@/app/components/admission/PatientFolderVisitsModal';
import {
	VisitClinicalBadges,
	clinicalBadgeToTab,
	type ClinicalBadgeKind,
} from '@/app/components/admission/AdmissionSearchClinicalBadges';
import { useAdmissionVisitDetail } from '@/app/hooks/useAdmissionVisitDetail';
import Loader from '@/app/components/Loader/Loader';
import styles from './search.module.css';
import sharedStyles from '../tables/tables.module.css';
import {
  type AdmissionPeriodo,
  formatDMY,
  rangoDesdePeriodo,
} from '@/app/utils/admissionDatePeriod';
import { groupRowsByPatient } from '@/app/utils/admissionSearchUtils';
import { interpretarBusquedaUnificada } from '@/app/utils/busquedaPaciente';

const initialFilters = {
  termino: '',
  fechaInicio: '',
  fechaFin: '',
};

function formatDocumento(raw: string | number | null | undefined): string {
  const digits = String(raw ?? '').replace(/\D+/g, '');
  if (!digits) return '—';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function iaLabel(row: AdmissionSearchRow): string {
  const c = String(row.ClasePaciente || '').trim().toUpperCase();
  if (c === 'I' || c === 'A') return c;
  const t = String(row.TipoAtencion || '').toLowerCase();
  if (t.includes('intern')) return 'I';
  if (t.includes('ambul')) return 'A';
  return c || '—';
}

function ingresoLabel(row: AdmissionSearchRow): string {
  if (row.FechaAdmisionDMY) return row.FechaAdmisionDMY;
  return formatDMY(row.FechaAdmision || '') || row.FechaAdmision || '—';
}

function egresoLabel(row: AdmissionSearchRow): string {
  if (row.FechaEgresoDMY) return row.FechaEgresoDMY;
  if (row.FechaEgreso) return formatDMY(row.FechaEgreso) || row.FechaEgreso;
  return '';
}

function diagnosticoLabel(row: AdmissionSearchRow): string {
  const desc = String(row.DiagnosticoDescripcion || '').trim();
  if (desc) return desc;
  return String(row.Diagnostico || '').trim() || '—';
}

export default function AdmissionSearchPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <Loader />
        </div>
      }
    >
      <AdmissionSearchPageContent />
    </Suspense>
  );
}

function AdmissionSearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const terminoUrl = (searchParams.get('termino') || searchParams.get('dni') || '').trim();

  const [filters, setFilters] = useState({
    ...initialFilters,
    termino: terminoUrl,
  });
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
    detailError,
    openVisitDetail,
    closeVisitDetail,
    reloadVisitDetail,
  } = useAdmissionVisitDetail();

  const runSearch = async (targetPage = 1, filtros = filters) => {
    try {
      setLoading(true);
      setError('');
      const response = await admissionSearchService.buscar({
        ...filtros,
        page: targetPage,
        limit: 25,
      });
      const data = response.data || [];
      setRows(data);
      setPage(response.pagination?.page || targetPage);
      setTotalPages(response.pagination?.totalPages || 0);
      setTotal(response.pagination?.total || 0);

      if (targetPage === 1 && filtros.termino.trim()) {
        const resultado = interpretarBusquedaUnificada(filtros.termino, data);
        if (resultado.tipo === 'visita') {
          void openVisitDetail(resultado.visita.NumeroVisita);
        }
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message || err?.message || 'Error al buscar admisiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runSearch(1, { ...initialFilters, termino: terminoUrl });
    // Solo al montar / cambiar el query de URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminoUrl]);

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
    await runSearch(1, initialFilters);
  };

  const groupedByPatient = useMemo(() => groupRowsByPatient(rows), [rows]);

  const handleBadgeClick = (kind: ClinicalBadgeKind, numeroVisita: number) => {
    void openVisitDetail(numeroVisita, clinicalBadgeToTab(kind));
  };

  const irAModificar = (numeroVisita: number) => {
    router.push(`/dashboard/admission/new?numeroVisita=${numeroVisita}`);
  };

  const filtrosActivos = useMemo(() => {
    const out: string[] = [];
    if (filters.termino.trim()) out.push(filters.termino.trim());
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
          <span className={styles.panelSubtitle}>
            Buscá por nombre, DNI o número de visita. Un número de visita abre el detalle.
          </span>
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

          <label className={styles.inlineFieldWide}>
            <span>Nombre, DNI o nº de visita</span>
            <input
              value={filters.termino}
              onChange={(e) => setFilters((f) => ({ ...f, termino: e.target.value }))}
              placeholder="Ej: Pérez, 32123456 o 236396"
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
            <div className={`${styles.tablaDesktop} ${sharedStyles.tableContainer}`}>
            <table className={sharedStyles.table}>
              <thead>
                <tr>
                  <th>I/A</th>
                  <th>Nº Admisión</th>
                  <th>Paciente</th>
                  <th>Cobertura</th>
                  <th>Ingreso / Egreso</th>
                  <th>Ubicación</th>
                  <th>Diagnóstico</th>
                  <th>Acciones</th>
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
                      <td>{iaLabel(row)}</td>
                      <td>
                        <div className={styles.cellStack}>
                          <button
                            type="button"
                            className={styles.linkButton}
                            onClick={() => openVisitDetail(row.NumeroVisita)}
                            title="Ver historia clínica"
                          >
                            {row.NumeroVisita}
                          </button>
                          <span className={styles.cellSub}>
                            Int. {String(row.NumeroInternacion || '').trim() || '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.cellStack}>
                          <span className={styles.cellPrimary}>
                            {String(row.ApellidoYNombre || '').trim() || '—'}
                          </span>
                          <span className={styles.cellSub}>
                            DNI {formatDocumento(row.NumeroDocumento)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.cellStack}>
                          <span className={styles.cellPrimary}>
                            {String(row.CoberturaOS || '').trim() || '—'}
                          </span>
                          <span className={styles.cellSub}>
                            SSN {String(row.NumeroSSN || '').trim() || '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.cellStack}>
                          <span className={styles.cellPrimary}>
                            {ingresoLabel(row)}
                            {row.HoraAdmision ? ` ${String(row.HoraAdmision).slice(0, 5)}` : ''}
                          </span>
                          <span className={styles.cellSub}>
                            {egresoLabel(row)
                              ? `Egr. ${egresoLabel(row)}${
                                  row.HoraEgreso ? ` ${String(row.HoraEgreso).slice(0, 5)}` : ''
                                }`
                              : 'Egr. —'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.cellStack}>
                          <span className={styles.cellPrimary}>
                            {String(row.Sector || '').trim() || '—'}
                          </span>
                          <span className={styles.cellSub}>
                            Hab. {String(row.Habitacion || '').trim() || '—'}
                          </span>
                        </div>
                      </td>
                      <td className={styles.diagCell} title={diagnosticoLabel(row)}>
                        {diagnosticoLabel(row)}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.modifyBtn}
                            onClick={() => irAModificar(row.NumeroVisita)}
                          >
                            Modificar
                          </button>
                          <VisitClinicalBadges row={row} onBadgeClick={handleBadgeClick} />
                        </div>
                      </td>
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
                        Admisión #{row.NumeroVisita}
                      </button>
                      <span className={styles.admissionCardDate}>{ingresoLabel(row)}</span>
                    </div>
                    <p className={styles.admissionCardMeta}>
                      Int. {String(row.NumeroInternacion || '').trim() || '—'} · Egr.{' '}
                      {egresoLabel(row) || '—'}
                    </p>
                    <p className={styles.admissionCardPatient}>{row.ApellidoYNombre}</p>
                    <p className={styles.admissionCardMeta}>
                      I/A {iaLabel(row)} · DNI {formatDocumento(row.NumeroDocumento)}
                    </p>
                    <p className={styles.admissionCardMeta}>
                      {String(row.CoberturaOS || '').trim() || 'Sin OS'} · SSN{' '}
                      {String(row.NumeroSSN || '').trim() || '—'}
                    </p>
                    <p className={styles.admissionCardMeta}>
                      {String(row.Sector || '').trim() || '—'} / Hab.{' '}
                      {String(row.Habitacion || '').trim() || '—'} · {diagnosticoLabel(row)}
                    </p>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.modifyBtn}
                        onClick={() => irAModificar(row.NumeroVisita)}
                      >
                        Modificar
                      </button>
                      <VisitClinicalBadges row={row} onBadgeClick={handleBadgeClick} />
                    </div>
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
                          DNI {formatDocumento(patient.NumeroDocumento)} · HC {patient.NumeroHC || '—'}
                        </span>
                        {visits[0] ? (
                          <span className={styles.folderLastVisit}>
                            Última visita: {ingresoLabel(visits[0])} {visits[0].HoraAdmision || ''}
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
        error={detailError}
        initialTab={detailInitialTab}
        onReloadData={() => void reloadVisitDetail()}
      />
    </div>
  );
}
