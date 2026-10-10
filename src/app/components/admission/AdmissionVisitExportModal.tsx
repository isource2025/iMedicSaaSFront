'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { admissionSearchService, type ExportSectionKey } from '@/app/services/admissionSearchService';
import styles from './AdmissionVisitExportModal.module.css';

type SectionDef = { id: ExportSectionKey; label: string; hint?: string };

/** Mismo orden que el menú del detalle de cama (Gestión Médica → Gestión Enfermería → Otras). */
const GROUPS: { titulo: string | null; items: SectionDef[] }[] = [
  {
    titulo: 'Internación',
    items: [
      { id: 'admision', label: 'Datos de admisión' },
      { id: 'movimientos', label: 'Movimientos de cama', hint: 'Ingreso, traslados y egreso' },
    ],
  },
  {
    titulo: 'Gestión médica',
    items: [
      { id: 'hcIngreso', label: 'HC de ingreso' },
      { id: 'indicaciones', label: 'Indicaciones', hint: 'Con quién indicó y suspendidas' },
      { id: 'evoluciones', label: 'Evoluciones' },
      { id: 'interconsultas', label: 'Interconsultas', hint: 'Pedido y respuesta' },
      { id: 'estudios', label: 'Estudios', hint: 'Pedidos y resultados' },
      { id: 'laboratorios', label: 'Laboratorio', hint: 'Parámetros y valores' },
      { id: 'protocolos', label: 'Protocolos' },
      { id: 'practicas', label: 'Procedimientos' },
      { id: 'epicrisis', label: 'Epicrisis' },
    ],
  },
  {
    titulo: 'Gestión enfermería',
    items: [
      { id: 'controles', label: 'Controles' },
      { id: 'medicamentos', label: 'Medicación suministrada' },
      { id: 'evolucionEnfermeria', label: 'Evolución de enfermería' },
      { id: 'balanceHidrico', label: 'Balance hídrico' },
      { id: 'dietas', label: 'Dietas' },
      { id: 'insumos', label: 'Insumos' },
    ],
  },
  { titulo: 'Documentación', items: [{ id: 'adjuntos', label: 'Adjuntos', hint: 'Índice, imágenes y PDFs anexos' }] },
];

const SECTIONS: SectionDef[] = GROUPS.flatMap((g) => g.items);

const NEEDS_DATE_SECTIONS: ExportSectionKey[] = SECTIONS.map((s) => s.id).filter((id) => id !== 'admision');

function defaultSelection(): Record<ExportSectionKey, boolean> {
  const o = {} as Record<ExportSectionKey, boolean>;
  for (const s of SECTIONS) o[s.id] = true;
  return o;
}

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

function toYmd(value: unknown): string | null {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return null;
}

function formatYmd(ymd: string): string {
  const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function inDateRange(ymd: string | null, fechaInicio: string, fechaFin: string, exportAll: boolean): boolean {
  if (exportAll) return true;
  const ini = fechaInicio.trim();
  const fin = fechaFin.trim();
  if (!ini && !fin) return true;
  if (!ymd) return true;
  if (ini && ymd < ini) return false;
  if (fin && ymd > fin) return false;
  return true;
}

function needsDateFilter(sections: ExportSectionKey[]): boolean {
  return sections.some((s) => NEEDS_DATE_SECTIONS.includes(s));
}

type EvoGroup = {
  serviceKey: string;
  serviceLabel: string;
  items: { line: string }[];
};

function getEvolucionService(raw: Record<string, unknown>): { key: string; label: string } {
  const esp = str(raw.EspecialidadDescripcion).trim();
  if (esp) return { key: esp.toLowerCase(), label: esp };
  const sec = str(raw.SectorDescripcion).trim();
  if (sec) return { key: sec.toLowerCase(), label: sec };
  const idSector = str(raw.IdSector).trim();
  if (idSector) return { key: `servicio_${idSector.toLowerCase()}`, label: `Servicio (${idSector})` };
  return { key: 'sin-servicio', label: 'Sin servicio' };
}

interface AdmissionVisitExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Export individual de una visita. */
  numeroVisita?: number | null;
  /** Export general de carpeta (todas las visitas del paciente). */
  idPaciente?: number | null;
  evolucionesMedicas?: Record<string, unknown>[];
}

export default function AdmissionVisitExportModal({
  isOpen,
  onClose,
  numeroVisita = null,
  idPaciente = null,
  evolucionesMedicas,
}: AdmissionVisitExportModalProps) {
  const modeGeneral = idPaciente != null && Number(idPaciente) > 0 && !(numeroVisita != null && Number(numeroVisita) > 0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Record<ExportSectionKey, boolean>>(defaultSelection);
  const [exportAll, setExportAll] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [serviceSelected, setServiceSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const evolucionesFiltradas = useMemo(() => {
    const rows = Array.isArray(evolucionesMedicas) ? evolucionesMedicas : [];
    return rows.filter((raw) => {
      const r = raw as Record<string, unknown>;
      return inDateRange(toYmd(r.FechaEv), fechaInicio, fechaFin, exportAll);
    });
  }, [evolucionesMedicas, fechaInicio, fechaFin, exportAll]);

  const evoGroups = useMemo((): EvoGroup[] => {
    const map = new Map<string, { label: string; items: { line: string }[] }>();
    for (const raw of evolucionesFiltradas) {
      const e = raw as Record<string, unknown>;
      const { key: serviceKey, label: serviceLabel } = getEvolucionService(e);
      const line =
        `${str(e.FechaEv)} ${str(e.HoraEv)} · ${str(e.ProfesionalNombreCompleto)}`.trim() || '—';
      if (!map.has(serviceKey)) {
        map.set(serviceKey, { label: serviceLabel, items: [] });
      }
      map.get(serviceKey)!.items.push({ line });
    }
    return Array.from(map.entries())
      .map(([serviceKey, v]) => ({
        serviceKey,
        serviceLabel: v.label,
        items: v.items,
      }))
      .sort((a, b) => a.serviceLabel.localeCompare(b.serviceLabel, 'es'));
  }, [evolucionesFiltradas]);

  useEffect(() => {
    if (isOpen) {
      setSelection(defaultSelection());
      setExportAll(true);
      setFechaInicio('');
      setFechaFin('');
      setServiceSelected({});
      setError('');
      setBusy(false);
    }
  }, [isOpen, numeroVisita]);

  useEffect(() => {
    if (!isOpen) return;
    setServiceSelected((prev) => {
      const next: Record<string, boolean> = {};
      for (const g of evoGroups) {
        next[g.serviceKey] = prev[g.serviceKey] !== false;
      }
      return next;
    });
  }, [isOpen, evoGroups]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const selectedList = useMemo(
    () => SECTIONS.filter((s) => selection[s.id]).map((s) => s.id),
    [selection]
  );

  const selectedCount = selectedList.length;
  const totalCount = SECTIONS.length;

  const setAll = (v: boolean) => {
    const next = { ...selection };
    for (const s of SECTIONS) next[s.id] = v;
    setSelection(next);
    if (v && evoGroups.length > 0) {
      setServiceSelected(Object.fromEntries(evoGroups.map((g) => [g.serviceKey, true])));
    }
  };

  const toggle = (id: ExportSectionKey) => {
    setSelection((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleService = (serviceKey: string) => {
    setServiceSelected((prev) => {
      const on = prev[serviceKey] !== false;
      return { ...prev, [serviceKey]: !on };
    });
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) onClose();
  };

  const summaryText = useMemo(() => {
    const bloques = `${selectedCount} bloque${selectedCount === 1 ? '' : 's'}`;
    if (exportAll) return `${bloques} · toda la visita`;
    const ini = fechaInicio.trim();
    const fin = fechaFin.trim();
    if (!ini && !fin) return `${bloques} · falta el rango de fechas`;
    if (ini && fin) return `${bloques} · ${formatYmd(ini)} – ${formatYmd(fin)}`;
    if (ini) return `${bloques} · desde ${formatYmd(ini)}`;
    return `${bloques} · hasta ${formatYmd(fin)}`;
  }, [selectedCount, exportAll, fechaInicio, fechaFin]);

  const runExport = async () => {
    const nv = numeroVisita != null ? Number(numeroVisita) : 0;
    const idp = idPaciente != null ? Number(idPaciente) : 0;
    if (!modeGeneral && !(nv > 0)) return;
    if (modeGeneral && !(idp > 0)) return;
    if (selectedList.length === 0) {
      setError('Marcá al menos un tipo de dato.');
      return;
    }
    if (selection.evoluciones && evoGroups.length > 0) {
      const anyService = evoGroups.some((g) => serviceSelected[g.serviceKey] !== false);
      if (!anyService) {
        setError('Seleccioná al menos un servicio en Evoluciones.');
        return;
      }
    }
    if (!exportAll && needsDateFilter(selectedList) && !fechaInicio.trim() && !fechaFin.trim()) {
      setError('Indicá fecha desde y/o hasta, o elegí “Toda la visita”.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const allKeys = evoGroups.map((g) => g.serviceKey);
      const picked = allKeys.filter((k) => serviceSelected[k] !== false);
      const subsetServices = picked.length > 0 && picked.length < allKeys.length;

      const body = {
        sections: selectedList,
        exportAll,
        fechaInicio: exportAll ? '' : fechaInicio.trim(),
        fechaFin: exportAll ? '' : fechaFin.trim(),
        ...(selection.evoluciones && subsetServices ? { evolucionServicioIds: picked } : {}),
      };
      const blob = modeGeneral
        ? await admissionSearchService.exportGeneralPaciente(idp, body)
        : await admissionSearchService.exportSelectivo(nv, body);
      if (!(blob instanceof Blob)) {
        throw new Error('No se pudo generar el PDF (respuesta inválida del servidor)');
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = modeGeneral
        ? `paciente_${idp}_carpeta.pdf`
        : `visita_${nv}_export.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo generar el archivo';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  const showEvoFold = evoGroups.length > 0;

  return (
    <div className={styles.overlay} onClick={handleBackdrop} role="presentation">
      <div className={styles.dialog} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="export-visita-title">
        <div className={styles.header}>
          <div className={`${styles.headerText} modal-title`}>
            <p className={styles.kicker}>PDF de la historia</p>
            <h2 id="export-visita-title" className={styles.title}>
              {modeGeneral
                ? 'Exportar carpeta'
                : `Exportar visita ${numeroVisita != null ? `#${numeroVisita}` : ''}`}
            </h2>
            <p className={styles.subtitle}>
              {modeGeneral
                ? 'Incluye todas las visitas del paciente. Elegí el período y qué bloques van al PDF.'
                : 'Elegí el período y qué bloques van al PDF. Cada registro sale con el profesional, su matrícula y su firma.'}
            </p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <section className={styles.scopeCard}>
            <div className={styles.sectionHead}>
              <h3 className={styles.blockTitle}>Período</h3>
            </div>
            <div className={styles.segment} role="radiogroup" aria-label="Período del export">
              <button
                type="button"
                role="radio"
                aria-checked={exportAll}
                className={exportAll ? styles.segmentActive : styles.segmentBtn}
                onClick={() => setExportAll(true)}
              >
                Toda la visita
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!exportAll}
                className={!exportAll ? styles.segmentActive : styles.segmentBtn}
                onClick={() => setExportAll(false)}
              >
                Por fechas
              </button>
            </div>
            {exportAll ? (
              <p className={styles.hint}>Se incluyen todos los registros, sin recortar por fecha.</p>
            ) : (
              <div className={styles.dateCard}>
                <div className={styles.dateRow}>
                  <label>
                    Desde
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                    />
                  </label>
                  <label>
                    Hasta
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                    />
                  </label>
                </div>
                <p className={styles.hint}>
                  Cada bloque usa su fecha habitual: HC del registro, medicación del control, estudios del
                  pedido, adjuntos de la carga. Los movimientos de cama se incluyen si se superponen con el
                  período.
                </p>
              </div>
            )}
          </section>

          <section className={styles.includeCard}>
            <div className={styles.sectionHead}>
              <h3 className={styles.blockTitle}>
                Qué incluir
                <span className={styles.countPill}>
                  {selectedCount}/{totalCount}
                </span>
              </h3>
              <div className={styles.selectAllRow}>
                <button type="button" className={styles.linkish} onClick={() => setAll(true)}>
                  Todo
                </button>
                <span className={styles.dotSep} aria-hidden>
                  ·
                </span>
                <button type="button" className={styles.linkish} onClick={() => setAll(false)}>
                  Nada
                </button>
              </div>
            </div>

            {GROUPS.map((group) => (
              <div key={group.titulo ?? 'general'}>
                {group.titulo ? <h4 className={styles.groupTitle}>{group.titulo}</h4> : null}
                <div className={styles.tileGrid}>
                  {group.items.map((s) => (
                    <label
                      key={s.id}
                      className={`${styles.tile} ${selection[s.id] ? styles.tileOn : ''}`}
                    >
                      <input type="checkbox" checked={selection[s.id]} onChange={() => toggle(s.id)} />
                      <span className={styles.tileText}>
                        <span className={styles.tileLabel}>{s.label}</span>
                        {s.id === 'evoluciones' && showEvoFold ? (
                          <span className={styles.tileHint}>{evolucionesFiltradas.length} en el período</span>
                        ) : s.hint ? (
                          <span className={styles.tileHint}>{s.hint}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>

                {group.items.some((s) => s.id === 'evoluciones') && showEvoFold && selection.evoluciones ? (
                  <details className={styles.evoDetails} open>
                    <summary className={styles.evoSummary}>
                      <span className={styles.evoSummaryInner}>
                        <span className={styles.tileText}>
                          <span className={styles.tileLabel}>Evoluciones por servicio</span>
                          <span className={styles.tileHint}>Destildá los servicios que no querés incluir</span>
                        </span>
                      </span>
                    </summary>
                    <div className={styles.evoBody}>
                      {evoGroups.map((g) => (
                        <label key={g.serviceKey} className={styles.evoServiceHead}>
                          <input
                            type="checkbox"
                            checked={serviceSelected[g.serviceKey] !== false}
                            onChange={() => toggleService(g.serviceKey)}
                            aria-label={`Incluir evoluciones de ${g.serviceLabel}`}
                          />
                          <span>
                            {g.serviceLabel}
                            <span className={styles.mutedCount}> · {g.items.length}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ))}
          </section>

          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <div className={styles.footer}>
          <p className={styles.summary}>{summaryText}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => void runExport()}
              disabled={busy || (!modeGeneral && !(numeroVisita != null && Number(numeroVisita) > 0))}
            >
              {busy ? 'Generando PDF…' : 'Descargar PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
