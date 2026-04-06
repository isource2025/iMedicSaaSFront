"use client";
import { useState, useMemo, useRef, useEffect, type CSSProperties } from "react";
import { ExamenLabCompleto, ExamenLabDetalle } from "@/app/types/laboratorios";
import { laboratoriosService } from "@/app/services/laboratoriosService";
import LabParameterChart, { LabDataPoint } from "./LabParameterChart";
import styles from "./LabAnalysisView.module.css";

interface LabAnalysisViewProps {
  examenes: ExamenLabCompleto[];
}

/** Agrupa por día de calendario (sin distinguir tipo de estudio). */
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

/** Último resultado del día (por hora) si hay varios estudios con el mismo parámetro. */
function detalleParametroEnDia(examenesDelDia: ExamenLabCompleto[], param: string): ExamenLabDetalle | undefined {
  const sorted = [...examenesDelDia].sort((a, b) => {
    const ta = new Date(a.FechaExamen).getTime() - new Date(b.FechaExamen).getTime();
    if (ta !== 0) return ta;
    return (a.HoraExamen || "").localeCompare(b.HoraExamen || "");
  });
  let found: ExamenLabDetalle | undefined;
  for (const ex of sorted) {
    const d = ex.detalles.find((x) => x.NombreParametro === param);
    if (d) found = d;
  }
  return found;
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

export default function LabAnalysisView({ examenes }: LabAnalysisViewProps) {
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

  /** Una columna por fecha (día), sin duplicar por tipo de estudio. */
  const columnasFecha = useMemo(() => {
    const map = new Map<string, ExamenLabCompleto[]>();
    examenes.forEach((ex) => {
      const k = fechaSoloDia(ex.FechaExamen);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ex);
    });
    const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
    return keys.map((key) => {
      const exs = map.get(key)!;
      exs.sort((a, b) => {
        const ta = new Date(a.FechaExamen).getTime() - new Date(b.FechaExamen).getTime();
        if (ta !== 0) return ta;
        return (a.HoraExamen || "").localeCompare(b.HoraExamen || "");
      });
      const label = laboratoriosService.formatDate(exs[0].FechaExamen);
      const tipos = [...new Set(exs.map((e) => laboratoriosService.getTipoEstudioNombre(e.TipoEstudio)))].join(
        " · "
      );
      return { key, label, examenes: exs, titleTip: tipos };
    });
  }, [examenes]);

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
    columnasFecha.forEach(({ examenes: exs }) => {
      exs.forEach((examen) => {
        examen.detalles.forEach((d) => {
          if (!map.has(d.NombreParametro) && d.UnidadMedida) {
            map.set(d.NombreParametro, d.UnidadMedida);
          }
        });
      });
    });
    return map;
  }, [columnasFecha]);

  const chartSeriesByParam = useMemo(() => {
    const m = new Map<string, LabDataPoint[]>();
    for (const param of todosParametros) {
      const puntos: LabDataPoint[] = columnasFecha.map(({ label, examenes: exs }) => {
        const detalle = detalleParametroEnDia(exs, param);
        return {
          fechaHora: label,
          valor: detalle ? parseValorNumerico(detalle.Resultado) : null,
          valorReferencia: detalle?.ValorReferencia,
        };
      });
      m.set(param, puntos);
    }
    return m;
  }, [todosParametros, columnasFecha]);

  const dateCount = columnasFecha.length;

  if (examenes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No hay exámenes de laboratorio para analizar</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Análisis de Laboratorios</h3>
        <p className={styles.subtitle}>
          Una columna por fecha de muestra (varios estudios el mismo día se unen). La casilla del encabezado
          activa o desactiva el gráfico en todas las filas; cada fila puede cambiarse por separado.
        </p>
      </div>

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
              {columnasFecha.map((col) => (
                <th key={col.key} className={styles.dateColHeader} scope="col" title={col.titleTip || undefined}>
                  <span className={styles.colHeaderMain}>{col.label}</span>
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
                    columnasFecha.map((col) => {
                      const detalle = detalleParametroEnDia(col.examenes, param);
                      return (
                        <td key={col.key} className={styles.valueCell}>
                          {detalle ? (
                            <>
                              <span
                                className={`${styles.value} ${
                                  detalle.FueraDeRango ? styles.valueAlert : ""
                                }`}
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
    </div>
  );
}
