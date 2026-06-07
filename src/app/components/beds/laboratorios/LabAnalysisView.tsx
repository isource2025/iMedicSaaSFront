"use client";
import { useState, useMemo, useRef, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ExamenLabCompleto, ExamenLabDetalle } from "@/app/types/laboratorios";
import { laboratoriosService } from "@/app/services/laboratoriosService";
import LabParameterChart, { LabDataPoint } from "./LabParameterChart";
import styles from "./LabAnalysisView.module.css";

interface LabAnalysisViewProps {
  examenes: ExamenLabCompleto[];
}

const TIPO_GROUP_THEME: Record<string, { headerBg: string; bodyBg: string; border: string }> = {
  HEMOGRAMA: { headerBg: "#fecdd3", bodyBg: "#fff1f2", border: "#fb7185" },
  QUIMICA_CLINICA: { headerBg: "#bfdbfe", bodyBg: "#eff6ff", border: "#3b82f6" },
  HEPATOGRAMA: { headerBg: "#fde68a", bodyBg: "#fffbeb", border: "#d97706" },
  GASOMETRIA: { headerBg: "#a5f3fc", bodyBg: "#ecfeff", border: "#0891b2" },
  IONOGRAMA: { headerBg: "#c4b5fd", bodyBg: "#f5f3ff", border: "#7c3aed" },
  COAGULOGRAMA: { headerBg: "#fbcfe8", bodyBg: "#fdf2f8", border: "#db2777" },
  PERFIL_LIPIDICO: { headerBg: "#86efac", bodyBg: "#f0fdf4", border: "#16a34a" },
  GENERAL: { headerBg: "#e2e8f0", bodyBg: "#f8fafc", border: "#64748b" },
};

const TIPO_THEME_FALLBACK = [
  { headerBg: "#e9d5ff", bodyBg: "#faf5ff", border: "#a855f7" },
  { headerBg: "#a7f3d0", bodyBg: "#ecfdf5", border: "#059669" },
  { headerBg: "#fcd34d", bodyBg: "#fffbeb", border: "#b45309" },
  { headerBg: "#93c5fd", bodyBg: "#eff6ff", border: "#1d4ed8" },
];

function themeForTipoLaboratorio(tipo: string, groupIndex: number) {
  if (TIPO_GROUP_THEME[tipo]) {
    return TIPO_GROUP_THEME[tipo];
  }
  return TIPO_THEME_FALLBACK[groupIndex % TIPO_THEME_FALLBACK.length];
}

/** Extrae YYYY-MM-DD de la fecha del examen (clave de respaldo si no hay IdExamen). */
function fechaSoloDia(fechaExamen: string): string {
  const s = fechaExamen.trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return s;
}

/** Clave única por estudio (columna de la tabla). */
function columnaKeyExamen(ex: ExamenLabCompleto, index: number): string {
  if (ex.IdExamen != null) return `ex-${ex.IdExamen}`;
  return `ex-${fechaSoloDia(ex.FechaExamen)}-${ex.HoraExamen || "00:00"}-${index}`;
}

function sortExamenesChrono(a: ExamenLabCompleto, b: ExamenLabCompleto): number {
  const ta = new Date(a.FechaExamen).getTime() - new Date(b.FechaExamen).getTime();
  if (ta !== 0) return ta;
  return (a.HoraExamen || "").localeCompare(b.HoraExamen || "");
}

function detalleParametroEnExamen(examen: ExamenLabCompleto, param: string): ExamenLabDetalle | undefined {
  return examen.detalles.find((x) => x.NombreParametro === param);
}

interface ColumnaEstudio {
  key: string;
  label: string;
  sublabel?: string;
  examen: ExamenLabCompleto;
  titleTip: string;
}

/** Una columna por estudio (no se unifican muestras del mismo día). */
function buildColumnasEstudio(examenes: ExamenLabCompleto[]): ColumnaEstudio[] {
  const sorted = [...examenes].sort(sortExamenesChrono);
  return sorted.map((examen, index) => {
    const label = laboratoriosService.formatDate(examen.FechaExamen);
    const hora = laboratoriosService.formatTime(examen.HoraExamen);
    const sublabel = hora !== "-" ? hora : undefined;
    const tipo = laboratoriosService.getTipoEstudioNombre(examen.TipoEstudio);
    const titleTip = [tipo, sublabel, examen.Protocolo, examen.Laboratorio].filter(Boolean).join(" · ");
    return {
      key: columnaKeyExamen(examen, index),
      label,
      sublabel,
      examen,
      titleTip,
    };
  });
}

function parseValorNumerico(resultado: string | undefined): number | null {
  if (!resultado || resultado.trim() === "") return null;
  const v = parseFloat(resultado.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(v) ? v : null;
}

function IconGrafico() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 3v18h18" />
      <path d="M7 12l4-4 4 4 6-6" />
      <circle cx="7" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="21" cy="6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTabla() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

/** Tabla + gráficos para un subconjunto de exámenes (un tipo de estudio). */
function LabAnalysisTableBlock({ examenes }: { examenes: ExamenLabCompleto[] }) {
  const [graphParams, setGraphParams] = useState<Set<string>>(() => new Set());
  const headerGraphCheckRef = useRef<HTMLInputElement>(null);

  const toggleGraphParam = (param: string) => {
    setGraphParams((prev) => {
      const next = new Set(prev);
      if (next.has(param)) next.delete(param);
      else next.add(param);
      return next;
    });
  };

  const columnasEstudio = useMemo(() => buildColumnasEstudio(examenes), [examenes]);

  const todosParametros = useMemo(() => {
    const nombres = new Set<string>();
    examenes.forEach((examen) => {
      examen.detalles.forEach((d) => nombres.add(d.NombreParametro));
    });
    return Array.from(nombres).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [examenes]);

  const toggleAllRowsGraph = () => {
    setGraphParams((prev) => {
      const allOn =
        todosParametros.length > 0 && todosParametros.every((p) => prev.has(p));
      if (allOn) return new Set();
      return new Set(todosParametros);
    });
  };

  const allRowsGraph =
    todosParametros.length > 0 && todosParametros.every((p) => graphParams.has(p));
  const someRowsGraph = graphParams.size > 0;

  useEffect(() => {
    const el = headerGraphCheckRef.current;
    if (!el) return;
    el.indeterminate = someRowsGraph && !allRowsGraph;
  }, [someRowsGraph, allRowsGraph]);

  const unidadPorParametro = useMemo(() => {
    const map = new Map<string, string>();
    columnasEstudio.forEach(({ examen }) => {
      examen.detalles.forEach((d) => {
        if (!map.has(d.NombreParametro) && d.UnidadMedida) {
          map.set(d.NombreParametro, d.UnidadMedida);
        }
      });
    });
    return map;
  }, [columnasEstudio]);

  const chartSeriesByParam = useMemo(() => {
    const m = new Map<string, LabDataPoint[]>();
    for (const param of todosParametros) {
      const puntos: LabDataPoint[] = columnasEstudio.map(({ label, sublabel, examen }) => {
        const detalle = detalleParametroEnExamen(examen, param);
        const fechaHora = sublabel ? `${label} ${sublabel}` : label;
        return {
          fechaHora,
          valor: detalle ? parseValorNumerico(detalle.Resultado) : null,
          valorReferencia: detalle?.ValorReferencia,
        };
      });
      m.set(param, puntos);
    }
    return m;
  }, [todosParametros, columnasEstudio]);

  const dateCount = columnasEstudio.length;

  if (examenes.length === 0) {
    return null;
  }

  return (
    <div
      className={styles.tableContainer}
      style={
        {
          "--lab-date-count": dateCount,
        } as CSSProperties
      }
    >
      <table className={`${styles.table} ${styles.tableDynamic}`}>
        <thead>
          <tr>
            <th className={styles.stickyCol} scope="col">
              <div className={styles.stickyHeaderInner}>
                <label className={styles.headerGraphCheckLabel} title="Gráfico en todas las filas">
                  <input
                    ref={headerGraphCheckRef}
                    type="checkbox"
                    className={styles.headerGraphCheck}
                    checked={allRowsGraph}
                    onChange={toggleAllRowsGraph}
                    aria-label="Mostrar gráfico en todas las filas"
                  />
                </label>
                <div className={styles.stickyHeaderText}>
                  <span className={styles.stickyHeaderTitle}>Parámetro</span>
                  <span className={styles.stickyHeaderHint}>Marcar = todas en gráfico</span>
                </div>
              </div>
            </th>
            {columnasEstudio.map((col) => (
              <th key={col.key} className={styles.dateColHeader} scope="col" title={col.titleTip || undefined}>
                <span className={styles.colHeaderMain}>{col.label}</span>
                {col.sublabel ? <span className={styles.colHeaderSub}>{col.sublabel}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {todosParametros.map((param) => {
            const unidad = unidadPorParametro.get(param);
            const isOpen = graphParams.has(param);

            return (
              <tr key={param} className={isOpen ? `${styles.rowActive} ${styles.rowChartMode}` : undefined}>
                <td className={`${styles.stickyCol} ${styles.paramCell}`}>
                  <div className={styles.stickyInner}>
                    <button
                      type="button"
                      className={`${styles.rowChartBtn} ${isOpen ? styles.rowChartBtnActive : ""}`}
                      onClick={() => toggleGraphParam(param)}
                      aria-label={isOpen ? `Volver a tabla para ${param}` : `Ver gráfico de ${param}`}
                      aria-pressed={isOpen}
                      title={isOpen ? "Mostrar valores en tabla" : "Mostrar gráfico en esta fila"}
                    >
                      {isOpen ? <IconTabla /> : <IconGrafico />}
                    </button>
                    <div className={styles.paramTextBlock}>
                      <span className={styles.paramName}>{param}</span>
                      {unidad ? <span className={styles.paramUnit}>{unidad}</span> : null}
                    </div>
                  </div>
                </td>
                {isOpen ? (
                  <td colSpan={dateCount} className={styles.chartInlineCell}>
                    <LabParameterChart
                      compact
                      hideHeader
                      data={chartSeriesByParam.get(param) ?? []}
                      parametro={param}
                      unidad={unidad}
                    />
                  </td>
                ) : (
                  columnasEstudio.map((col) => {
                    const detalle = detalleParametroEnExamen(col.examen, param);
                    return (
                      <td key={col.key} className={styles.valueCell}>
                        {detalle ? (
                          <>
                            <span
                              className={`${styles.value} ${detalle.FueraDeRango ? styles.valueAlert : ""}`}
                            >
                              {detalle.Resultado}
                            </span>
                            {detalle.ValorReferencia ? (
                              <span className={styles.reference}>({detalle.ValorReferencia})</span>
                            ) : null}
                          </>
                        ) : (
                          <span className={styles.noData}>—</span>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LabAnalysisTipoSections({ examenes }: { examenes: ExamenLabCompleto[] }) {
  const examenesPorTipo = useMemo(() => {
    const map = new Map<string, ExamenLabCompleto[]>();
    for (const ex of examenes) {
      const k = ex.TipoEstudio || "GENERAL";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ex);
    }
    return Array.from(map.entries()).sort((a, b) =>
      laboratoriosService.getTipoEstudioNombre(a[0]).localeCompare(
        laboratoriosService.getTipoEstudioNombre(b[0]),
        "es"
      )
    );
  }, [examenes]);

  if (examenes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No hay exámenes que coincidan con el filtro seleccionado</p>
      </div>
    );
  }

  return (
    <div className={styles.tipoSections}>
      {examenesPorTipo.map(([tipo, exs], gi) => {
        const theme = themeForTipoLaboratorio(tipo, gi);
        return (
          <section
            key={tipo}
            className={styles.tipoAnalysisSection}
            style={{
              borderColor: theme.border,
              backgroundColor: theme.bodyBg,
            }}
          >
            <header
              className={styles.tipoAnalysisHeader}
              style={{
                backgroundColor: theme.headerBg,
                borderBottomColor: theme.border,
              }}
            >
              <span className={styles.tipoAnalysisHeaderIcon} aria-hidden>
                {laboratoriosService.getTipoEstudioIcon(tipo)}
              </span>
              <span>{laboratoriosService.getTipoEstudioNombre(tipo)}</span>
              <span className={styles.tipoAnalysisHeaderCount}>
                {exs.length} muestra{exs.length !== 1 ? "s" : ""}
              </span>
            </header>
            <div className={styles.tipoAnalysisBody}>
              <LabAnalysisTableBlock examenes={exs} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function LabAnalysisView({ examenes }: LabAnalysisViewProps) {
  const tiposDisponibles = useMemo(() => {
    const s = new Set<string>();
    for (const ex of examenes) {
      s.add(ex.TipoEstudio || "GENERAL");
    }
    return Array.from(s).sort((a, b) =>
      laboratoriosService.getTipoEstudioNombre(a).localeCompare(
        laboratoriosService.getTipoEstudioNombre(b),
        "es"
      )
    );
  }, [examenes]);

  const [selectedTipos, setSelectedTipos] = useState<string[]>([]);
  const [maximized, setMaximized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!maximized) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMaximized(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [maximized]);

  const toggleTipoFiltro = (tipo: string) => {
    setSelectedTipos((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    );
  };

  const filteredExamenes = useMemo(() => {
    if (selectedTipos.length === 0) return examenes;
    const set = new Set(selectedTipos);
    return examenes.filter((e) => set.has(e.TipoEstudio || "GENERAL"));
  }, [examenes, selectedTipos]);

  if (examenes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No hay exámenes de laboratorio para analizar</p>
      </div>
    );
  }

  const analysisToolbar = (
    <div className={styles.analysisToolbar}>
      <div className={styles.filterRow}>
        <span className={styles.filterLabel}>Filtrar por tipo</span>
        <span className={styles.filterHint}>
          Sin selección = <strong>todos</strong>. Puede marcar uno o varios.
        </span>
      </div>
      <div className={styles.filterChips} role="group" aria-label="Tipos de estudio de laboratorio">
        {tiposDisponibles.map((tipo) => {
          const active = selectedTipos.includes(tipo);
          return (
            <button
              key={tipo}
              type="button"
              className={`${styles.filterChip} ${active ? styles.filterChipActive : ""}`}
              onClick={() => toggleTipoFiltro(tipo)}
              aria-pressed={active}
            >
              {laboratoriosService.getTipoEstudioIcon(tipo)}{" "}
              {laboratoriosService.getTipoEstudioNombre(tipo)}
            </button>
          );
        })}
      </div>
      <div className={styles.toolbarActions}>
        {maximized ? (
          <button
            type="button"
            className={styles.maximizeBtn}
            onClick={() => setMaximized(false)}
            title="Volver al tamaño normal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
            Restaurar
          </button>
        ) : (
          <button
            type="button"
            className={styles.maximizeBtn}
            onClick={() => setMaximized(true)}
            title="Usar toda la pantalla para tablas y gráficos"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
            Maximizar
          </button>
        )}
      </div>
    </div>
  );

  const innerAnalysis = (
    <>
      <div className={styles.header}>
        <h3 className={styles.title}>Análisis de Laboratorios</h3>
        <p className={styles.subtitle}>
          Los estudios se agrupan por tipo. En cada bloque hay una columna por muestra (fecha y hora);
          si hay varios estudios el mismo día, cada uno conserva su columna y sus valores.
          La casilla del encabezado activa o desactiva el gráfico en todas las filas de ese bloque.
        </p>
      </div>
      {analysisToolbar}
      <LabAnalysisTipoSections examenes={filteredExamenes} />
    </>
  );

  const fullscreenNode =
    maximized &&
    mounted &&
    createPortal(
      <div className={styles.fullscreenPortalRoot} role="dialog" aria-modal="true" aria-label="Análisis en pantalla completa">
        <div className={styles.fullscreenBackdrop} aria-hidden />
        <div className={styles.fullscreenSheet}>
          <div className={styles.fullscreenBody}>{innerAnalysis}</div>
        </div>
      </div>,
      document.body
    );

  if (maximized) {
    return (
      <>
        <div className={styles.containerPlaceholder} aria-hidden />
        {fullscreenNode}
      </>
    );
  }

  return <div className={styles.container}>{innerAnalysis}</div>;
}
