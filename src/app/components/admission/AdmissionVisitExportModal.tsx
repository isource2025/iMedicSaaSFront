'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { admissionSearchService, type ExportSectionKey } from '@/app/services/admissionSearchService';
import styles from './AdmissionVisitExportModal.module.css';

const SECTIONS: { id: ExportSectionKey; label: string }[] = [
  { id: 'admision', label: 'Datos de admisión' },
  { id: 'hcIngreso', label: 'HC de ingreso' },
  { id: 'practicas', label: 'Prácticas por paciente' },
  { id: 'indicaciones', label: 'Indicaciones' },
  { id: 'medicamentos', label: 'Medicamentos suministrados' },
  { id: 'evoluciones', label: 'Evoluciones' },
  { id: 'estudios', label: 'Estudios solicitados (pedidos / resultados)' },
  { id: 'protocolos', label: 'Protocolos clínicos' },
  { id: 'adjuntos', label: 'Adjuntos (solo metadatos; sin archivos binarios)' },
];

const SECTIONS_MAIN = SECTIONS.filter((s) => s.id !== 'evoluciones');
const EVO_META = SECTIONS.find((s) => s.id === 'evoluciones')!;

const NEEDS_DATE_SECTIONS: ExportSectionKey[] = [
  'hcIngreso',
  'practicas',
  'indicaciones',
  'medicamentos',
  'estudios',
  'protocolos',
  'adjuntos',
  'evoluciones',
];

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
  numeroVisita: number | null;
  evolucionesMedicas?: Record<string, unknown>[];
}

export default function AdmissionVisitExportModal({
  isOpen,
  onClose,
  numeroVisita,
  evolucionesMedicas,
}: AdmissionVisitExportModalProps) {
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

  const runExport = async () => {
    if (!numeroVisita) return;
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
      setError('Indicá fecha desde y/o hasta, o elegí “Exportar todo”.');
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
      const blob = await admissionSearchService.exportSelectivo(numeroVisita, body);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `visita_${numeroVisita}_export.pdf`;
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
          <h2 id="export-visita-title" className={styles.title}>
            Exportar visita {numeroVisita != null ? `#${numeroVisita}` : ''}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.block}>
            <p className={styles.blockTitle}>Alcance temporal</p>
            <div className={styles.radioRow}>
              <label>
                <input
                  type="radio"
                  name="exportScope"
                  checked={exportAll}
                  onChange={() => setExportAll(true)}
                />
                Exportar todo (sin filtrar por fecha)
              </label>
              <label>
                <input
                  type="radio"
                  name="exportScope"
                  checked={!exportAll}
                  onChange={() => setExportAll(false)}
                />
                Filtrar por fecha de cada registro
              </label>
            </div>
            <div className={styles.dateRow}>
              <label>
                Desde
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  disabled={exportAll}
                />
              </label>
              <label>
                Hasta
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  disabled={exportAll}
                />
              </label>
            </div>
            <p className={styles.hint}>
              Con filtro activo, cada bloque usa su fecha habitual (ej.: HC → fecha del registro, medicación → fecha de
              control, estudios → fecha del examen, adjuntos → fecha de carga).
            </p>
          </div>

          <div className={styles.block}>
            <p className={styles.blockTitle}>Qué incluir</p>
            <div className={styles.selectAllRow}>
              <button type="button" className={styles.linkish} onClick={() => setAll(true)}>
                Marcar todo
              </button>
              <button type="button" className={styles.linkish} onClick={() => setAll(false)}>
                Desmarcar todo
              </button>
            </div>
            <div className={styles.checkboxList}>
              {SECTIONS_MAIN.map((s) => (
                <label key={s.id} className={styles.checkboxRow}>
                  <input type="checkbox" checked={selection[s.id]} onChange={() => toggle(s.id)} />
                  <span>{s.label}</span>
                </label>
              ))}

              {showEvoFold ? (
                <details className={styles.evoDetails} open>
                  <summary className={styles.evoSummary}>
                    <span className={styles.evoSummaryInner}>
                      <input
                        type="checkbox"
                        checked={selection.evoluciones}
                        onChange={() => toggle('evoluciones')}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Incluir evoluciones en el PDF"
                      />
                      <span>{EVO_META.label}</span>
                      <span className={styles.evoChevron}>▾ Desplegar por servicio</span>
                    </span>
                  </summary>
                  <p className={`${styles.hint} ${styles.evoHint}`}>
                    Marcá qué servicios querés incluir. Las evoluciones listadas son las de esta visita; el
                    rango de fechas de arriba sigue aplicando dentro de cada servicio elegido.
                  </p>
                  <p className={`${styles.hint} ${styles.evoHint}`}>
                    Evoluciones visibles con el filtro actual: {evolucionesFiltradas.length}
                  </p>
                  {evoGroups.map((g) => (
                    <div key={g.serviceKey} className={styles.evoServiceBlock}>
                      <label className={styles.evoServiceHead}>
                        <input
                          type="checkbox"
                          checked={serviceSelected[g.serviceKey] !== false}
                          disabled={!selection.evoluciones}
                          onChange={() => toggleService(g.serviceKey)}
                          aria-label={`Incluir evoluciones de ${g.serviceLabel}`}
                        />
                        <span>
                          {g.serviceLabel}
                          <span className={styles.mutedCount}> ({g.items.length})</span>
                        </span>
                      </label>
                      <ul className={styles.evoItemList}>
                        {g.items.map((it, idx) => (
                          <li key={idx}>{it.line}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </details>
              ) : (
                <label className={styles.checkboxRow}>
                  <input type="checkbox" checked={selection.evoluciones} onChange={() => toggle('evoluciones')} />
                  <span>{EVO_META.label}</span>
                </label>
              )}
            </div>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.actions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => void runExport()}
              disabled={busy || !numeroVisita}
            >
              {busy ? 'Generando…' : 'Descargar PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
