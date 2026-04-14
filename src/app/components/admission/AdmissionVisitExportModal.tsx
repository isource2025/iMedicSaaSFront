'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { admissionSearchService, type ExportSectionKey } from '@/app/services/admissionSearchService';
import styles from './AdmissionVisitExportModal.module.css';

const SECTIONS: { id: ExportSectionKey; label: string }[] = [
  { id: 'admision', label: 'Datos de admisión' },
  { id: 'hcIngreso', label: 'HC de ingreso' },
  { id: 'practicas', label: 'Prácticas (indicaciones)' },
  { id: 'medicamentos', label: 'Medicamentos suministrados' },
  { id: 'evoluciones', label: 'Evoluciones' },
  { id: 'estudios', label: 'Estudios solicitados (laboratorio con detalle)' },
  { id: 'protocolos', label: 'Protocolos (resumen por estudio)' },
  { id: 'adjuntos', label: 'Adjuntos (solo metadatos; sin archivos binarios)' },
];

const SECTIONS_MAIN = SECTIONS.filter((s) => s.id !== 'evoluciones');
const EVO_META = SECTIONS.find((s) => s.id === 'evoluciones')!;

const NEEDS_DATE_SECTIONS: ExportSectionKey[] = [
  'hcIngreso',
  'practicas',
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

function needsDateFilter(sections: ExportSectionKey[]): boolean {
  return sections.some((s) => NEEDS_DATE_SECTIONS.includes(s));
}

type EvoGroup = {
  sectorKey: string;
  sectorLabel: string;
  items: { line: string }[];
};

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
  const [sectorSelected, setSectorSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const evoGroups = useMemo((): EvoGroup[] => {
    const map = new Map<string, { label: string; items: { line: string }[] }>();
    for (const raw of evolucionesMedicas || []) {
      const e = raw as Record<string, unknown>;
      const sectorKey = String(e.IdSector ?? '').trim();
      const desc = str(e.SectorDescripcion).trim();
      const sectorLabel =
        desc || (sectorKey === '' ? 'Sin servicio' : `Servicio (${sectorKey})`);
      const line =
        `${str(e.FechaEv)} ${str(e.HoraEv)} · ${str(e.ProfesionalNombreCompleto)}`.trim() || '—';
      if (!map.has(sectorKey)) {
        map.set(sectorKey, { label: sectorLabel, items: [] });
      }
      map.get(sectorKey)!.items.push({ line });
    }
    return Array.from(map.entries())
      .map(([sectorKey, v]) => ({
        sectorKey,
        sectorLabel: v.label,
        items: v.items,
      }))
      .sort((a, b) => a.sectorLabel.localeCompare(b.sectorLabel, 'es'));
  }, [evolucionesMedicas]);

  useEffect(() => {
    if (isOpen) {
      setSelection(defaultSelection());
      setExportAll(true);
      setFechaInicio('');
      setFechaFin('');
      setSectorSelected({});
      setError('');
      setBusy(false);
    }
  }, [isOpen, numeroVisita]);

  useEffect(() => {
    if (!isOpen) return;
    setSectorSelected((prev) => {
      const next: Record<string, boolean> = {};
      for (const g of evoGroups) {
        next[g.sectorKey] = prev[g.sectorKey] !== false;
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
      setSectorSelected(Object.fromEntries(evoGroups.map((g) => [g.sectorKey, true])));
    }
  };

  const toggle = (id: ExportSectionKey) => {
    setSelection((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSector = (sectorKey: string) => {
    setSectorSelected((prev) => {
      const on = prev[sectorKey] !== false;
      return { ...prev, [sectorKey]: !on };
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
      const anySector = evoGroups.some((g) => sectorSelected[g.sectorKey] !== false);
      if (!anySector) {
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
      const allKeys = evoGroups.map((g) => g.sectorKey);
      const picked = allKeys.filter((k) => sectorSelected[k] !== false);
      const subsetSectors = picked.length > 0 && picked.length < allKeys.length;

      const body = {
        sections: selectedList,
        exportAll,
        fechaInicio: exportAll ? '' : fechaInicio.trim(),
        fechaFin: exportAll ? '' : fechaFin.trim(),
        ...(selection.evoluciones && subsetSectors ? { evolucionSectorIds: picked } : {}),
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
                    Marcá qué servicios (sectores) querés incluir. Las evoluciones listadas son las de esta visita; el
                    rango de fechas de arriba sigue aplicando dentro de cada servicio elegido.
                  </p>
                  {evoGroups.map((g) => (
                    <div key={g.sectorKey === '' ? '_empty' : g.sectorKey} className={styles.evoServiceBlock}>
                      <label className={styles.evoServiceHead}>
                        <input
                          type="checkbox"
                          checked={sectorSelected[g.sectorKey] !== false}
                          disabled={!selection.evoluciones}
                          onChange={() => toggleSector(g.sectorKey)}
                          aria-label={`Incluir evoluciones de ${g.sectorLabel}`}
                        />
                        <span>
                          {g.sectorLabel}
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
