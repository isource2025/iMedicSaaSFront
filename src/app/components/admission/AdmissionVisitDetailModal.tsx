'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import Modal from '@/app/components/UI/Modal';
import {
  buildHCIPhysicalExamSections,
  HCI_CAMPOS_TEXTO_LIBRE,
} from '@/app/utils/hciIngresoDisplay';
import styles from './AdmissionVisitDetailModal.module.css';
import AdmissionAdjuntosGrid from './AdmissionAdjuntosGrid';
import AdmissionVisitExportModal from './AdmissionVisitExportModal';

export type VisitDetailPayload = {
  generadoEn?: string;
  admision?: {
    NumeroVisita?: number;
    IdPaciente?: number;
    ApellidoYNombre?: string;
    NumeroDocumento?: string;
    NumeroHC?: string;
    FechaAdmision?: string;
    HoraAdmision?: string;
  };
  historialClinico?: Record<string, unknown>[];
  practicasPaciente?: Array<{
    Practica?: string | number;
    CantidadPractica?: string | number;
    FechaPractica?: string;
    HoraPracticaInicio?: string;
  }>;
  indicaciones?: Record<string, unknown>[];
  medicamentos?: Record<string, unknown>[];
  practicas?: {
    laboratorios?: Array<{
      IdExamen?: number;
      TipoEstudio?: string;
      FechaExamen?: string;
      HoraExamen?: string;
      Protocolo?: string;
      Laboratorio?: string;
      Estado?: string;
      detalles?: Array<Record<string, unknown>>;
    }>;
    adjuntos?: Array<Record<string, unknown>>;
  };
  evolucionesMedicas?: Record<string, unknown>[];
};

type TabId =
  | 'resumen'
  | 'hcIngreso'
  | 'practicas'
  | 'indicaciones'
  | 'medicamentos'
  | 'evoluciones'
  | 'estudios'
  | 'protocolos'
  | 'adjuntos';

const TAB_LABELS: Record<TabId, string> = {
  resumen: 'Resumen',
  hcIngreso: 'HC de ingreso',
  practicas: 'Prácticas',
  indicaciones: 'Indicaciones',
  medicamentos: 'Medicamentos suministrados',
  evoluciones: 'Evoluciones',
  estudios: 'Estudios solicitados',
  protocolos: 'Protocolos',
  adjuntos: 'Adjuntos',
};

function str(v: unknown): string {
  if (v == null || v === '') return '';
  return String(v);
}

function getEvolucionService(raw: Record<string, unknown>): string {
  return (
    str(raw.EspecialidadDescripcion).trim() ||
    str(raw.SectorDescripcion).trim() ||
    (str(raw.IdSector).trim() ? `Servicio (${str(raw.IdSector).trim()})` : 'Sin servicio')
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className={styles.emptyState}>{message}</p>;
}

function DefinitionList({ items }: { items: { label: string; value: string }[] }) {
  const filtered = items.filter((x) => x.value);
  if (filtered.length === 0) return <EmptyState message="Sin datos para mostrar." />;
  return (
    <dl className={styles.dl}>
      {filtered.map(({ label, value }) => (
        <div key={label} className={styles.dlRow}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function HCIAdmissionRecordCard({ record, index }: { record: Record<string, unknown>; index: number }) {
  const r = record;
  const idHc = str(r.IdHCIngreso) || `hci-${index}`;
  const titleLine =
    str(r.ProfesionalNombre) || str(r.IdProfecional) || `Registro ${index + 1}`;
  const sector = str(r.SectorDescripcion);
  const fecha = str(r.FechaFormateada) || str(r.Fecha);
  const hora = str(r.HoraFormateada);
  const motivo = str(r.MotivoConsulta);
  const enfermedad = str(r.EnfermedadActual);

  const extraTextBlocks = Object.entries(HCI_CAMPOS_TEXTO_LIBRE).flatMap(([field, titulo]) => {
    const val = str(r[field]);
    if (!val) return [];
    return [{ titulo, val }];
  });

  const examSections = buildHCIPhysicalExamSections(r).sort((a, b) =>
    a.titulo.localeCompare(b.titulo, 'es')
  );

  const hasClinicalBody =
    Boolean(motivo) ||
    Boolean(enfermedad) ||
    extraTextBlocks.length > 0 ||
    examSections.some((s) => s.campos.length > 0);

  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <strong>{titleLine}</strong>
        <span className={styles.muted}>
          {[sector, [fecha, hora].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || '—'}
        </span>
      </div>
      <p className={styles.muted} style={{ margin: '0 0 8px', fontSize: '0.8rem' }}>
        ID HC ingreso: {idHc}
      </p>
      {motivo ? (
        <div className={styles.hciSectionBlock}>
          <h4 className={styles.hciSectionTitle}>Motivo de consulta</h4>
          <p className={styles.textBody}>{motivo}</p>
        </div>
      ) : null}
      {enfermedad ? (
        <div className={styles.hciSectionBlock}>
          <h4 className={styles.hciSectionTitle}>Enfermedad actual</h4>
          <p className={styles.textBody}>{enfermedad}</p>
        </div>
      ) : null}
      {extraTextBlocks.map(({ titulo, val }) => (
        <div key={titulo} className={styles.hciSectionBlock}>
          <h4 className={styles.hciSectionTitle}>{titulo}</h4>
          <p className={styles.textBody}>{val}</p>
        </div>
      ))}
      {examSections.map((sec) =>
        sec.campos.length === 0 ? null : (
          <details key={sec.titulo} className={styles.sectionDetails} open>
            <summary>{sec.titulo}</summary>
            <div className={styles.tableScroll}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.campos.map((c, i) => (
                    <tr key={`${sec.titulo}-${i}`}>
                      <td>{c.label}</td>
                      <td>{c.valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )
      )}
      {!hasClinicalBody ? (
        <EmptyState message="No hay texto clínico ni examen físico en los campos estándar de esta HC. Si debería haber datos, revisá en Camas / HC de ingreso." />
      ) : null}
    </li>
  );
}

interface AdmissionVisitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  numeroVisita: number | null;
  loading: boolean;
  data: VisitDetailPayload | null;
}

export default function AdmissionVisitDetailModal({
  isOpen,
  onClose,
  numeroVisita,
  loading,
  data,
}: AdmissionVisitDetailModalProps) {
  const baseId = useId();
  const [activeTab, setActiveTab] = useState<TabId>('resumen');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [evolucionServiceFilter, setEvolucionServiceFilter] = useState('todos');

  useEffect(() => {
    if (!isOpen) {
      setExportModalOpen(false);
      return;
    }
    setActiveTab('resumen');
    setExportModalOpen(false);
    setEvolucionServiceFilter('todos');
  }, [isOpen, numeroVisita]);

  const counts = useMemo(() => {
    const hci = data?.historialClinico?.length ?? 0;
    const practicas = data?.practicasPaciente?.length ?? 0;
    const indicaciones = data?.indicaciones?.length ?? 0;
    const med = data?.medicamentos?.length ?? 0;
    const evo = data?.evolucionesMedicas?.length ?? 0;
    const labs = data?.practicas?.laboratorios ?? [];
    const estudios = labs.length;
    const protocolos = labs.filter((ex) => str(ex.Protocolo).trim() !== '').length;
    const adj = data?.practicas?.adjuntos?.length ?? 0;
    return { hci, practicas, indicaciones, med, evo, estudios, protocolos, adj };
  }, [data]);

  const tabs: TabId[] = [
    'resumen',
    'hcIngreso',
    'practicas',
    'indicaciones',
    'medicamentos',
    'evoluciones',
    'estudios',
    'protocolos',
    'adjuntos',
  ];

  const tabBadge = (id: TabId): string | null => {
    if (id === 'resumen') return null;
    const map: Record<Exclude<TabId, 'resumen'>, number> = {
      hcIngreso: counts.hci,
      practicas: counts.practicas,
      indicaciones: counts.indicaciones,
      medicamentos: counts.med,
      evoluciones: counts.evo,
      estudios: counts.estudios,
      protocolos: counts.protocolos,
      adjuntos: counts.adj,
    };
    const n = map[id as Exclude<TabId, 'resumen'>];
    return n > 0 ? String(n) : '0';
  };

  const title = numeroVisita ? `Visita #${numeroVisita}` : 'Detalle de visita';

  const evolucionesServicios = useMemo(() => {
    const set = new Set<string>();
    for (const raw of data?.evolucionesMedicas || []) {
      set.add(getEvolucionService(raw as Record<string, unknown>));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [data?.evolucionesMedicas]);

  const evolucionesFiltradas = useMemo(() => {
    const rows = data?.evolucionesMedicas || [];
    if (evolucionServiceFilter === 'todos') return rows;
    return rows.filter(
      (raw) => getEvolucionService(raw as Record<string, unknown>) === evolucionServiceFilter
    );
  }, [data?.evolucionesMedicas, evolucionServiceFilter]);

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="full">
      <div className={styles.modalBody}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <button type="button" className={styles.backBtn} onClick={onClose}>
              ← Atrás a resultados
            </button>
            <button
              type="button"
              className={styles.exportToolbarBtn}
              onClick={() => setExportModalOpen(true)}
              disabled={!numeroVisita || loading || !data}
            >
              Exportar…
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingBox} role="status" aria-live="polite">
            Cargando información de la visita…
          </div>
        ) : null}

        {!loading && !data ? (
          <EmptyState message="No se pudo cargar el detalle. Probá de nuevo o cerrá y reabrí la visita." />
        ) : null}

        {!loading && data ? (
          <>
            <div className={styles.tabList} role="tablist" aria-label="Secciones del detalle de visita">
              {tabs.map((tab) => {
                const selected = activeTab === tab;
                const badge = tabBadge(tab);
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    id={`${baseId}-tab-${tab}`}
                    aria-selected={selected}
                    aria-controls={`${baseId}-panel-${tab}`}
                    tabIndex={selected ? 0 : -1}
                    className={`${styles.tab} ${selected ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {TAB_LABELS[tab]}
                    {badge != null ? <span className={styles.tabBadge}>{badge}</span> : null}
                  </button>
                );
              })}
            </div>

            <div
              id={`${baseId}-panel-resumen`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-resumen`}
              hidden={activeTab !== 'resumen'}
              className={styles.panel}
            >
              <h3 className={styles.panelTitle}>Datos de la admisión</h3>
              <DefinitionList
                items={[
                  { label: 'Número de visita', value: str(data.admision?.NumeroVisita) },
                  { label: 'Paciente', value: str(data.admision?.ApellidoYNombre) },
                  { label: 'DNI', value: str(data.admision?.NumeroDocumento) },
                  { label: 'Historia clínica', value: str(data.admision?.NumeroHC) },
                  { label: 'Fecha de admisión', value: str(data.admision?.FechaAdmision) },
                  { label: 'Hora', value: str(data.admision?.HoraAdmision) },
                  { label: 'Id paciente', value: str(data.admision?.IdPaciente) },
                ]}
              />
            </div>

            <div
              id={`${baseId}-panel-hcIngreso`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-hcIngreso`}
              hidden={activeTab !== 'hcIngreso'}
              className={styles.panel}
            >
              <h3 className={styles.panelTitle}>Historia clínica de ingreso</h3>
              {!data.historialClinico?.length ? (
                <EmptyState message="No hay registros de HCI para esta visita." />
              ) : (
                <ul className={styles.cardList}>
                  {data.historialClinico.map((row, idx) => {
                    const rec = row as Record<string, unknown>;
                    const cardKey = str(rec.IdHCIngreso) || `hci-${idx}`;
                    return <HCIAdmissionRecordCard key={cardKey} record={rec} index={idx} />;
                  })}
                </ul>
              )}
            </div>

            <div
              id={`${baseId}-panel-practicas`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-practicas`}
              hidden={activeTab !== 'practicas'}
              className={styles.panel}
            >
              <h3 className={styles.panelTitle}>Prácticas por paciente</h3>
              {!data.practicasPaciente?.length ? (
                <EmptyState message="No hay prácticas registradas para esta visita." />
              ) : (
                <div className={styles.tableScroll}>
                  <table className={`${styles.dataTable} ${styles.tableCompact}`}>
                    <thead>
                      <tr>
                        <th>Práctica</th>
                        <th>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.practicasPaciente.map((raw, idx) => {
                        const row = raw as Record<string, unknown>;
                        const key = `${str(row.Practica) || 'pr'}-${idx}`;
                        return (
                          <tr key={key}>
                            <td className={styles.cellClamp}>{str(row.Practica) || '—'}</td>
                            <td>{str(row.CantidadPractica) || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div
              id={`${baseId}-panel-indicaciones`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-indicaciones`}
              hidden={activeTab !== 'indicaciones'}
              className={styles.panel}
            >
              <h3 className={styles.panelTitle}>Indicaciones</h3>
              {!data.indicaciones?.length ? (
                <EmptyState message="No hay indicaciones registradas." />
              ) : (
                <div className={styles.tableScroll}>
                  <table className={`${styles.dataTable} ${styles.tableCompact}`}>
                    <thead>
                      <tr>
                        <th>Nº</th>
                        <th>Descripción</th>
                        <th>Medicamento</th>
                        <th>Frec.</th>
                        <th>Próx.</th>
                        <th>Últ.</th>
                        <th>Prof.</th>
                        <th>Obs.</th>
                        <th>Adic.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.indicaciones.map((raw, idx) => {
                        const ind = raw as Record<string, unknown>;
                        const nro = str(ind.nroIndicacion ?? ind.NroIndicacion ?? idx);
                        const desc = str(ind.descripcion ?? ind.DescripcionIndicacion);
                        const med = str(ind.medicamento ?? ind.AliasMedicamento);
                        const freq = str(ind.frecuencia ?? ind.Frecuencia);
                        const obs = str(ind.observaciones ?? ind.Observaciones);
                        const hijas = (ind.indicacionesHijas as Record<string, unknown>[] | undefined) || [];
                        const adic =
                          hijas.length === 0
                            ? ''
                            : hijas
                                .map((h) =>
                                  [str(h.descripcion), str(h.cantidad), str(h.tipoUnidad)].filter(Boolean).join(' ')
                                )
                                .join(' · ');
                        return (
                          <tr key={nro}>
                            <td>{nro}</td>
                            <td className={styles.cellClamp}>{desc || '—'}</td>
                            <td className={styles.cellClamp}>{med || '—'}</td>
                            <td>{freq || '—'}</td>
                            <td>{str(ind.proximaAplicacion) || '—'}</td>
                            <td>{str(ind.ultimaAplicacion) || '—'}</td>
                            <td className={styles.cellClamp}>{str(ind.fullName) || '—'}</td>
                            <td className={styles.cellClamp}>{obs || '—'}</td>
                            <td className={styles.cellClamp}>{adic || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div
              id={`${baseId}-panel-medicamentos`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-medicamentos`}
              hidden={activeTab !== 'medicamentos'}
              className={styles.panel}
            >
              <h3 className={styles.panelTitle}>Medicamentos suministrados</h3>
              {!data.medicamentos?.length ? (
                <EmptyState message="No hay registros de medicación para esta visita." />
              ) : (
                <div className={styles.tableScroll}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Medicamento</th>
                        <th>Fecha control</th>
                        <th>Hora</th>
                        <th>Cantidad</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.medicamentos.map((raw, idx) => {
                        const m = raw as Record<string, unknown>;
                        const key = str(m.IDCtrlMedica ?? m.NroIndicacion ?? idx);
                        return (
                          <tr key={key}>
                            <td>{str(m.NombreMedicamento ?? m.AliasMedicamento ?? m.DescripcionMedicamento)}</td>
                            <td>{str(m.FechaControl)}</td>
                            <td>{str(m.HoraControl)}</td>
                            <td>
                              {str(m.Cantidad)} {str(m.TipoUnidad)}
                            </td>
                            <td className={styles.cellClamp}>{str(m.Observaciones)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div
              id={`${baseId}-panel-evoluciones`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-evoluciones`}
              hidden={activeTab !== 'evoluciones'}
              className={styles.panel}
            >
              <h3 className={styles.panelTitle}>Evoluciones médicas</h3>
              {evolucionesServicios.length > 0 ? (
                <div className={styles.evoFilters}>
                  <span className={styles.evoFiltersLabel}>Servicio:</span>
                  <div className={styles.evoFiltersWrap}>
                    <button
                      type="button"
                      className={`${styles.evoFilterBtn} ${evolucionServiceFilter === 'todos' ? styles.evoFilterBtnActive : ''}`}
                      onClick={() => setEvolucionServiceFilter('todos')}
                    >
                      Todos
                    </button>
                    {evolucionesServicios.map((srv) => (
                      <button
                        key={srv}
                        type="button"
                        className={`${styles.evoFilterBtn} ${evolucionServiceFilter === srv ? styles.evoFilterBtnActive : ''}`}
                        onClick={() => setEvolucionServiceFilter(srv)}
                      >
                        {srv}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {!data.evolucionesMedicas?.length ? (
                <EmptyState message="No hay evoluciones registradas." />
              ) : evolucionesFiltradas.length === 0 ? (
                <EmptyState message="No hay evoluciones para el servicio seleccionado." />
              ) : (
                <ul className={styles.cardList}>
                  {evolucionesFiltradas.map((raw, idx) => {
                    const e = raw as Record<string, unknown>;
                    const id = str(e.IdHCEvolucion ?? idx);
                    return (
                      <li key={id} className={styles.card}>
                        <div className={styles.cardHead}>
                          <strong>
                            {str(e.FechaEv)} {str(e.HoraEv)}
                          </strong>
                          <span className={styles.muted}>
                            {str(e.ProfesionalNombreCompleto)}
                            {` · ${getEvolucionService(e)}`}
                          </span>
                        </div>
                        {str(e.Evolucion) ? <p className={styles.evoText}>{str(e.Evolucion)}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div
              id={`${baseId}-panel-estudios`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-estudios`}
              hidden={activeTab !== 'estudios'}
              className={styles.panel}
            >
              <h3 className={styles.panelTitle}>Estudios solicitados</h3>
              {!data.practicas?.laboratorios?.length ? (
                <EmptyState message="No hay estudios de laboratorio cargados para esta visita." />
              ) : (
                <div className={styles.labList}>
                  {data.practicas.laboratorios.map((ex) => (
                    <details key={str(ex.IdExamen)} className={styles.labBlock} open>
                      <summary className={styles.labSummary}>
                        <span>{str(ex.TipoEstudio) || 'Estudio'}</span>
                        <span className={styles.muted}>
                          {str(ex.FechaExamen)} {str(ex.HoraExamen)}
                          {ex.Protocolo ? ` · Protocolo ${str(ex.Protocolo)}` : ''}
                        </span>
                      </summary>
                      {!ex.detalles?.length ? (
                        <EmptyState message="Sin detalle de parámetros." />
                      ) : (
                        <div className={styles.tableScroll}>
                          <table className={styles.dataTable}>
                            <thead>
                              <tr>
                                <th>Parámetro</th>
                                <th>Resultado</th>
                                <th>Referencia</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ex.detalles.map((d, i) => {
                                const row = d as Record<string, unknown>;
                                return (
                                  <tr key={i}>
                                    <td>{str(row.NombreParametro)}</td>
                                    <td>{str(row.Resultado)}</td>
                                    <td>{str(row.ValorReferencia)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </details>
                  ))}
                </div>
              )}
            </div>

            <div
              id={`${baseId}-panel-protocolos`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-protocolos`}
              hidden={activeTab !== 'protocolos'}
              className={styles.panel}
            >
              <h3 className={styles.panelTitle}>Protocolos</h3>
              {!data.practicas?.laboratorios?.length ? (
                <EmptyState message="No hay estudios para listar protocolos." />
              ) : (
                <div className={styles.tableScroll}>
                  <table className={`${styles.dataTable} ${styles.tableCompact}`}>
                    <thead>
                      <tr>
                        <th>Protocolo</th>
                        <th>Estudio</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Laboratorio</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.practicas.laboratorios.map((ex, i) => (
                        <tr key={str(ex.IdExamen) || i}>
                          <td>{str(ex.Protocolo) || '—'}</td>
                          <td className={styles.cellClamp}>{str(ex.TipoEstudio) || '—'}</td>
                          <td>{str(ex.FechaExamen) || '—'}</td>
                          <td>{str(ex.HoraExamen) || '—'}</td>
                          <td className={styles.cellClamp}>{str(ex.Laboratorio) || '—'}</td>
                          <td>{str(ex.Estado) || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div
              id={`${baseId}-panel-adjuntos`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-adjuntos`}
              hidden={activeTab !== 'adjuntos'}
              className={styles.panel}
            >
              <h3 className={styles.panelTitle}>Adjuntos</h3>
              {!data.practicas?.adjuntos?.length ? (
                <EmptyState message="No hay adjuntos para esta visita." />
              ) : (
                <AdmissionAdjuntosGrid items={data.practicas.adjuntos as Record<string, unknown>[]} />
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.backBtn} onClick={onClose}>
                ← Atrás a resultados
              </button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
    {isOpen ? (
      <AdmissionVisitExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        numeroVisita={numeroVisita}
        evolucionesMedicas={data?.evolucionesMedicas}
      />
    ) : null}
    </>
  );
}
