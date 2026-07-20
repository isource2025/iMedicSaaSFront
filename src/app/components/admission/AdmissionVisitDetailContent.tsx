'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  buildHCIPhysicalExamSections,
  HCI_CAMPOS_TEXTO_LIBRE,
} from '@/app/utils/hciIngresoDisplay';
import type { VisitDetailPayload, VisitDetailTabId } from './AdmissionVisitDetailModal';
import AdmissionAdjuntosGrid from './AdmissionAdjuntosGrid';
import styles from './AdmissionVisitDetailModal.module.css';

export type VisitDetailSectionId = VisitDetailTabId;

const SECTION_LABELS: Record<Exclude<VisitDetailSectionId, 'resumen'>, string> = {
  hcIngreso: 'Historia clínica de ingreso',
  practicas: 'Prácticas',
  indicaciones: 'Indicaciones',
  medicamentos: 'Medicamentos suministrados',
  evoluciones: 'Evoluciones',
  estudios: 'Estudios solicitados',
  protocolos: 'Protocolos',
  adjuntos: 'Adjuntos',
};

const SECTION_ORDER: Exclude<VisitDetailSectionId, 'resumen'>[] = [
  'hcIngreso',
  'practicas',
  'indicaciones',
  'medicamentos',
  'evoluciones',
  'estudios',
  'protocolos',
  'adjuntos',
];

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

function HCIRecordPlain({ record, index }: { record: Record<string, unknown>; index: number }) {
  const r = record;
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
    a.titulo.localeCompare(b.titulo, 'es'),
  );

  const hasClinicalBody =
    Boolean(motivo) ||
    Boolean(enfermedad) ||
    extraTextBlocks.length > 0 ||
    examSections.some((s) => s.campos.length > 0);

  return (
    <article className={styles.docBlock}>
      <p className={styles.docMeta}>
        <strong>{titleLine}</strong>
        {[sector, [fecha, hora].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || '—'}
      </p>

      {motivo ? (
        <>
          <h4 className={styles.dividerTitle}>Motivo de consulta</h4>
          <p className={styles.plainText}>{motivo}</p>
        </>
      ) : null}

      {enfermedad ? (
        <>
          <hr className={styles.divider} />
          <h4 className={styles.dividerTitle}>Enfermedad actual</h4>
          <p className={styles.plainText}>{enfermedad}</p>
        </>
      ) : null}

      {extraTextBlocks.map(({ titulo, val }) => (
        <div key={titulo}>
          <hr className={styles.divider} />
          <h4 className={styles.dividerTitle}>{titulo}</h4>
          <p className={styles.plainText}>{val}</p>
        </div>
      ))}

      {examSections.map((sec) =>
        sec.campos.length === 0 ? null : (
          <div key={sec.titulo}>
            <hr className={styles.divider} />
            <h4 className={styles.dividerTitle}>{sec.titulo}</h4>
            {sec.campos.map((c, i) => (
              <p key={`${sec.titulo}-${i}`} className={styles.fieldLine}>
                <span className={styles.fieldLabel}>{c.label}:</span> {c.valor}
              </p>
            ))}
          </div>
        ),
      )}

      {!hasClinicalBody ? (
        <EmptyState message="No hay texto clínico ni examen físico en los campos estándar de esta HC." />
      ) : null}
    </article>
  );
}

export interface AdmissionVisitDetailContentProps {
  numeroVisita: number | null;
  loading: boolean;
  data: VisitDetailPayload | null;
  initialSection?: VisitDetailSectionId;
  onBack?: () => void;
  backLabel?: string;
  exportButton?: React.ReactNode;
  /** Muestra solo el cuerpo de una sección (panel inline, sin acordeones). */
  singleSectionOnly?: Exclude<VisitDetailSectionId, 'resumen'>;
  hideToolbar?: boolean;
  hideResumen?: boolean;
}

export default function AdmissionVisitDetailContent({
  numeroVisita,
  loading,
  data,
  initialSection,
  onBack,
  backLabel = '← Atrás',
  exportButton,
  singleSectionOnly,
  hideToolbar = false,
  hideResumen = false,
}: AdmissionVisitDetailContentProps) {
  const baseId = useId();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [evolucionServiceFilter, setEvolucionServiceFilter] = useState('todos');
  const sectionRefs = useRef<Partial<Record<string, HTMLDetailsElement | null>>>({});

  const counts = useMemo(() => {
    const hci = data?.historialClinico?.length ?? 0;
    const practicas = data?.practicasPaciente?.length ?? 0;
    const indicaciones = data?.indicaciones?.length ?? 0;
    const med = data?.medicamentos?.length ?? 0;
    const evo = data?.evolucionesMedicas?.length ?? 0;
    const estudios = data?.estudios?.length ?? 0;
    const protocolos = data?.protocolos?.length ?? 0;
    const adj = data?.practicas?.adjuntos?.length ?? 0;
    return { hci, practicas, indicaciones, med, evo, estudios, protocolos, adj };
  }, [data]);

  const countFor = (id: Exclude<VisitDetailSectionId, 'resumen'>): number => {
    const map = {
      hcIngreso: counts.hci,
      practicas: counts.practicas,
      indicaciones: counts.indicaciones,
      medicamentos: counts.med,
      evoluciones: counts.evo,
      estudios: counts.estudios,
      protocolos: counts.protocolos,
      adjuntos: counts.adj,
    };
    return map[id];
  };

  useEffect(() => {
    setEvolucionServiceFilter('todos');
    if (initialSection && initialSection !== 'resumen') {
      setOpenSections(new Set([initialSection]));
      const t = window.setTimeout(() => {
        sectionRefs.current[initialSection]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => window.clearTimeout(t);
    }
    setOpenSections(new Set());
  }, [numeroVisita, initialSection, data]);

  const jumpToSection = (id: Exclude<VisitDetailSectionId, 'resumen'>) => {
    setOpenSections((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

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
      (raw) => getEvolucionService(raw as Record<string, unknown>) === evolucionServiceFilter,
    );
  }, [data?.evolucionesMedicas, evolucionServiceFilter]);

  const renderSectionBody = (id: Exclude<VisitDetailSectionId, 'resumen'>) => {
    if (!data) return null;

    switch (id) {
      case 'hcIngreso':
        if (!data.historialClinico?.length) {
          return <EmptyState message="No hay registros de HCI para esta visita." />;
        }
        return data.historialClinico.map((row, idx) => {
          const rec = row as Record<string, unknown>;
          const key = str(rec.IdHCIngreso) || `hci-${idx}`;
          return <HCIRecordPlain key={key} record={rec} index={idx} />;
        });

      case 'practicas':
        if (!data.practicasPaciente?.length) {
          return <EmptyState message="No hay prácticas registradas para esta visita." />;
        }
        return data.practicasPaciente.map((raw, idx) => {
          const row = raw as Record<string, unknown>;
          const key = `${str(row.Valor ?? row.Practica) || 'pr'}-${idx}`;
          const desc = str(row.PracticaDescripcion || row.Practica);
          return (
            <div key={key} className={styles.listItem}>
              <p className={styles.listItemTitle}>
                {str(row.Practica) || '—'} — {desc || 'Sin descripción'}
              </p>
              <p className={styles.listItemMeta}>
                {[
                  str(row.TipoPractica) && `Tipo: ${str(row.TipoPractica)}`,
                  str(row.CantidadPractica) && `Cant.: ${str(row.CantidadPractica)}`,
                  str(row.FechaPractica) && `Fecha: ${str(row.FechaPractica)}`,
                  str(row.HoraPracticaInicio) &&
                    `Hora: ${str(row.HoraPracticaInicio)}${row.HoraPracticaFin ? ` – ${str(row.HoraPracticaFin)}` : ''}`,
                  str(row.ValorSector) && `Sector: ${str(row.ValorSector)}`,
                  str(row.Profesionales) && `Prof.: ${str(row.Profesionales)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          );
        });

      case 'indicaciones':
        if (!data.indicaciones?.length) {
          return <EmptyState message="No hay indicaciones registradas." />;
        }
        return data.indicaciones.map((raw, idx) => {
          const ind = raw as Record<string, unknown>;
          const nro = str(ind.nroIndicacion ?? ind.NroIndicacion ?? idx);
          const desc = str(ind.descripcion ?? ind.DescripcionIndicacion);
          const med = str(ind.medicamento ?? ind.AliasMedicamento);
          const obs = str(ind.observaciones ?? ind.Observaciones);
          return (
            <div key={nro} className={styles.listItem}>
              <p className={styles.listItemTitle}>
                Indicación {nro}
                {desc ? ` — ${desc}` : ''}
              </p>
              <p className={styles.plainText}>
                {[med && `Medicamento: ${med}`, str(ind.frecuencia ?? ind.Frecuencia) && `Frecuencia: ${str(ind.frecuencia ?? ind.Frecuencia)}`, obs && `Obs.: ${obs}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          );
        });

      case 'medicamentos':
        if (!data.medicamentos?.length) {
          return <EmptyState message="No hay registros de medicación para esta visita." />;
        }
        return data.medicamentos.map((raw, idx) => {
          const m = raw as Record<string, unknown>;
          const key = str(m.IDCtrlMedica ?? m.NroIndicacion ?? idx);
          return (
            <div key={key} className={styles.listItem}>
              <p className={styles.listItemTitle}>
                {str(m.NombreMedicamento ?? m.AliasMedicamento ?? m.DescripcionMedicamento) || 'Medicamento'}
              </p>
              <p className={styles.listItemMeta}>
                {[str(m.FechaControl), str(m.HoraControl), `${str(m.Cantidad)} ${str(m.TipoUnidad)}`.trim(), str(m.Observaciones)]
                  .filter((x) => x && x !== ' ')
                  .join(' · ')}
              </p>
            </div>
          );
        });

      case 'evoluciones':
        return (
          <>
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
              evolucionesFiltradas.map((raw, idx) => {
                const e = raw as Record<string, unknown>;
                const id = str(e.IdHCEvolucion ?? idx);
                return (
                  <div key={id} className={styles.listItem}>
                    <p className={styles.listItemTitle}>
                      {str(e.FechaEv)} {str(e.HoraEv)} — {str(e.ProfesionalNombreCompleto) || 'Sin profesional'}
                    </p>
                    <p className={styles.listItemMeta}>{getEvolucionService(e)}</p>
                    {str(e.Evolucion) ? <p className={styles.plainText}>{str(e.Evolucion)}</p> : null}
                  </div>
                );
              })
            )}
          </>
        );

      case 'estudios':
        if (!data.estudios?.length) {
          return <EmptyState message="No hay estudios solicitados (pedidos) para esta visita." />;
        }
        return data.estudios.map((ex, i) => {
          const id = ex.IdPedido ?? ex.id ?? i;
          const titulo =
            str(ex.PracticaDescripcion || ex.practicaDescripcion) ||
            str(ex.PedidoEstudio || ex.pedidoEstudio) ||
            `Pedido #${id}`;
          const fecha = str(ex.FechaPedido || ex.fechaPedido).slice(0, 16);
          const urg = str(ex.estadoUrgencia || ex.EstadoUrgencia);
          const nroProt = str(ex.NroProtocolo || ex.nroProtocolo);
          const resultado = str(ex.ResultadoEstudio || ex.resultadoEstudio);
          const solicitante = str(ex.MedicoSolicitanteNombre || ex.medicoSolicitanteNombre);
          const realizador = str(ex.RealizadorNombre || ex.realizadorNombre);
          return (
            <div key={String(id)} className={styles.listItem}>
              <p className={styles.listItemTitle}>{titulo}</p>
              <p className={styles.listItemMeta}>
                {[
                  fecha,
                  urg ? `Urgencia: ${urg}` : '',
                  solicitante ? `Solicita: ${solicitante}` : '',
                  realizador ? `Realiza: ${realizador}` : '',
                  nroProt ? `Protocolo resultado ${nroProt}` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {str(ex.PedidoEstudio || ex.pedidoEstudio) &&
              str(ex.PedidoEstudio || ex.pedidoEstudio) !== titulo ? (
                <p className={styles.plainText}>{str(ex.PedidoEstudio || ex.pedidoEstudio)}</p>
              ) : null}
              {resultado ? (
                <p className={styles.plainText}>
                  <span className={styles.fieldLabel}>Resultado:</span> {resultado.slice(0, 500)}
                  {resultado.length > 500 ? '…' : ''}
                </p>
              ) : (
                <p className={styles.muted}>Sin resultado cargado.</p>
              )}
              {ex.cantidadAdjuntos ? (
                <p className={styles.muted}>{ex.cantidadAdjuntos} adjunto(s)</p>
              ) : null}
            </div>
          );
        });

      case 'protocolos':
        if (!data.protocolos?.length) {
          return <EmptyState message="No hay protocolos clínicos para esta visita." />;
        }
        return data.protocolos.map((p, i) => {
          const id = p.idProtocolo ?? i;
          const tipo = str(p.tipoDescripcion || p.tipoProtocolo) || 'Protocolo';
          const nro = p.numeroProtocolo != null ? String(p.numeroProtocolo) : '—';
          const fecha = str(p.fecha).slice(0, 16);
          const practicas = Array.isArray(p.practicas) ? p.practicas : [];
          const equipo = practicas.flatMap((x) => {
            const pros = Array.isArray((x as { profesionales?: unknown[] }).profesionales)
              ? ((x as { profesionales: Array<Record<string, unknown>> }).profesionales)
              : [];
            return pros.map((pr) => {
              const nombre = str(pr.apellidoNombre);
              const rol = str(pr.funcionNombre);
              if (!nombre) return '';
              return rol ? `${nombre} (${rol})` : nombre;
            });
          }).filter(Boolean);
          return (
            <div key={String(id)} className={styles.listItem}>
              <p className={styles.listItemTitle}>
                {tipo} · N° {nro}
              </p>
              <p className={styles.listItemMeta}>
                {[fecha, str(p.operadorNombre), str(p.estado)].filter(Boolean).join(' · ')}
              </p>
              {equipo.length > 0 ? (
                <p className={styles.fieldLine}>
                  <span className={styles.fieldLabel}>Equipo:</span> {equipo.join(' · ')}
                </p>
              ) : null}
              {str(p.diagnosticoPre) ? (
                <p className={styles.fieldLine}>
                  <span className={styles.fieldLabel}>Dx pre:</span> {str(p.diagnosticoPre)}
                </p>
              ) : null}
              {str(p.diagnosticoPos) ? (
                <p className={styles.fieldLine}>
                  <span className={styles.fieldLabel}>Dx pos:</span> {str(p.diagnosticoPos)}
                </p>
              ) : null}
              {str(p.tecnica) ? (
                <p className={styles.fieldLine}>
                  <span className={styles.fieldLabel}>Técnica:</span> {str(p.tecnica)}
                </p>
              ) : null}
              {practicas.length > 0 ? (
                <p className={styles.muted}>
                  {practicas.length} práctica(s):{' '}
                  {practicas
                    .map((x) => str((x as Record<string, unknown>).descripcion || (x as Record<string, unknown>).codigoPractica))
                    .filter(Boolean)
                    .join(', ')}
                </p>
              ) : null}
            </div>
          );
        });

      case 'adjuntos':
        if (!data.practicas?.adjuntos?.length) {
          return <EmptyState message="No hay adjuntos para esta visita." />;
        }
        return <AdmissionAdjuntosGrid items={data.practicas.adjuntos as Record<string, unknown>[]} />;

      default:
        return null;
    }
  };

  return (
    <div className={styles.contentRoot}>
      {!hideToolbar && (onBack || exportButton) && (
        <div className={styles.toolbarRow}>
          {onBack ? (
            <button type="button" className={styles.backBtn} onClick={onBack}>
              {backLabel}
            </button>
          ) : (
            <span />
          )}
          {exportButton}
        </div>
      )}

      {loading ? (
        <div className={styles.loadingBox} role="status" aria-live="polite">
          <span className={styles.loadingSpinner} aria-hidden />
        </div>
      ) : null}

      {!loading && !data ? (
        <EmptyState message="No se pudo cargar el detalle. Probá de nuevo." />
      ) : null}

      {!loading && data && singleSectionOnly ? (
        <div className={styles.inlineSectionPanel}>
          <h4 className={styles.inlineSectionTitle}>{SECTION_LABELS[singleSectionOnly]}</h4>
          <div className={styles.sectionBody}>{renderSectionBody(singleSectionOnly)}</div>
        </div>
      ) : null}

      {!loading && data && !singleSectionOnly ? (
        <>
          {!hideResumen ? (
            <section className={styles.resumenBlock} aria-label="Datos de admisión">
              <h3 className={styles.resumenHeading}>Admisión</h3>
              <p className={styles.resumenLine}>
                Visita <strong>#{str(data.admision?.NumeroVisita)}</strong>
                {str(data.admision?.ApellidoYNombre) ? ` · ${str(data.admision?.ApellidoYNombre)}` : ''}
              </p>
              <p className={styles.resumenLine}>
                DNI {str(data.admision?.NumeroDocumento) || '—'} · HC {str(data.admision?.NumeroHC) || '—'}
              </p>
              <p className={styles.resumenLine}>
                Ingreso: {str(data.admision?.FechaAdmision) || '—'} {str(data.admision?.HoraAdmision) || ''}
              </p>
            </section>
          ) : null}

          <div className={styles.jumpChips} role="group" aria-label="Ir a sección clínica">
            {SECTION_ORDER.map((id) => {
              const n = countFor(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`${styles.jumpChip} ${n === 0 ? styles.jumpChipMuted : ''}`}
                  onClick={() => jumpToSection(id)}
                  disabled={n === 0}
                >
                  {SECTION_LABELS[id]} ({n})
                </button>
              );
            })}
          </div>

          <div className={styles.sectionsStack}>
            {SECTION_ORDER.map((id) => {
              const n = countFor(id);
              const open = openSections.has(id);
              return (
                <details
                  key={id}
                  id={`${baseId}-section-${id}`}
                  ref={(el) => {
                    sectionRefs.current[id] = el;
                  }}
                  className={styles.sectionAccordion}
                  open={open}
                  onToggle={(e) => {
                    const el = e.currentTarget;
                    setOpenSections((prev) => {
                      const next = new Set(prev);
                      if (el.open) next.add(id);
                      else next.delete(id);
                      return next;
                    });
                  }}
                >
                  <summary className={styles.sectionSummary}>
                    <span>{SECTION_LABELS[id]}</span>
                    <span className={styles.sectionCount}>{n}</span>
                  </summary>
                  <div className={styles.sectionBody}>{renderSectionBody(id)}</div>
                </details>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
