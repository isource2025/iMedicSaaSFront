'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ProduccionHospital.module.css';

export interface OpcionMulti {
  id: string;
  label: string;
  /** Texto secundario a la derecha (p. ej. cantidad de prácticas). */
  detalle?: string;
}

interface MultiSelectProps {
  label: string;
  opciones: OpcionMulti[];
  seleccion: string[];
  onChange: (ids: string[]) => void;
  cargando?: boolean;
  /** Placeholder del buscador. */
  buscar?: string;
}

/** Cuántas opciones se dibujan a la vez: los catálogos grandes (coberturas) se filtran tipeando. */
const MAX_VISIBLES = 120;

/** Selector múltiple con buscador. Cierra al hacer clic afuera o con Escape. */
export function MultiSelect({
  label,
  opciones,
  seleccion,
  onChange,
  cargando = false,
  buscar = 'Buscar…',
}: MultiSelectProps) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alClickAfuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', alClickAfuera);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClickAfuera);
      document.removeEventListener('keydown', alTecla);
    };
  }, [abierto]);

  const seleccionSet = useMemo(() => new Set(seleccion), [seleccion]);

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    const lista = q ? opciones.filter((o) => o.label.toLowerCase().includes(q)) : opciones;
    // Lo elegido primero, para que siempre se vea aunque el catálogo sea largo.
    return [...lista].sort((a, b) => Number(seleccionSet.has(b.id)) - Number(seleccionSet.has(a.id)));
  }, [opciones, texto, seleccionSet]);

  const alternar = (id: string) => {
    onChange(seleccionSet.has(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id]);
  };

  const resumen =
    seleccion.length === 0
      ? 'Todas'
      : seleccion.length === 1
        ? (opciones.find((o) => o.id === seleccion[0])?.label ?? '1 elegida')
        : `${seleccion.length} elegidas`;

  return (
    <div className={styles.multi} ref={raiz}>
      <span className={styles.filterLabel}>{label}</span>
      <button
        type="button"
        className={`${styles.multiButton} ${seleccion.length ? styles.multiButtonActive : ''}`}
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        <span className={styles.multiButtonText}>{cargando && !opciones.length ? 'Cargando…' : resumen}</span>
        <span className={styles.multiCaret} aria-hidden="true">
          ▾
        </span>
      </button>

      {abierto && (
        <div className={styles.multiPanel} role="listbox" aria-multiselectable="true">
          <input
            className={styles.multiSearch}
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={buscar}
            autoFocus
          />
          <div className={styles.multiActions}>
            <button type="button" onClick={() => onChange([])} disabled={!seleccion.length}>
              Limpiar
            </button>
            <span>
              {seleccion.length ? `${seleccion.length} de ${opciones.length}` : `${opciones.length} opciones`}
            </span>
          </div>
          <div className={styles.multiList}>
            {filtradas.length === 0 && <div className={styles.multiEmpty}>Sin resultados</div>}
            {filtradas.slice(0, MAX_VISIBLES).map((o) => (
              <label key={o.id} className={styles.multiOption}>
                <input type="checkbox" checked={seleccionSet.has(o.id)} onChange={() => alternar(o.id)} />
                <span className={styles.multiOptionLabel}>{o.label}</span>
                {o.detalle && <span className={styles.multiOptionDetail}>{o.detalle}</span>}
              </label>
            ))}
            {filtradas.length > MAX_VISIBLES && (
              <div className={styles.multiEmpty}>
                Hay {filtradas.length - MAX_VISIBLES} más: escribí para acotar la búsqueda
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiSelect;
