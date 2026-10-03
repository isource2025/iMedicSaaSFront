'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './PrefijosPracticaPicker.module.css';

export type PrefijoOpcion = {
  value: string;
  label: string;
  detail?: string;
};

type Props = {
  /** Todos los prefijos (capítulos del nomenclador) que se pueden elegir. */
  options: PrefijoOpcion[];
  /** Valor guardado: lista separada por comas ("42,66,87"). */
  value: string;
  /** Devuelve la lista lista para guardar, separada por comas y ordenada ("42,66,87"). */
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Largo de la columna en la base; no se deja elegir más de lo que entra. */
  maxLength?: number;
  /** Para los tests y la accesibilidad cuando hay más de un selector en pantalla. */
  name?: string;
};

/** "42, 66,87" -> ['42','66','87'] (numéricos, únicos y ordenados). */
export function parsearPrefijos(texto: string): string[] {
  const out = new Set<number>();
  for (const raw of String(texto ?? '').split(',')) {
    const t = raw.trim();
    if (!/^\d{1,3}$/.test(t)) continue;
    const n = Number(t);
    if (n > 0) out.add(n);
  }
  return Array.from(out)
    .sort((a, b) => a - b)
    .map(String);
}

export function unirPrefijos(lista: Iterable<string>): string {
  return parsearPrefijos(Array.from(lista).join(',')).join(',');
}

export default function PrefijosPracticaPicker({
  options,
  value,
  onChange,
  disabled,
  maxLength,
  name = 'prefijos',
}: Props) {
  const [filtro, setFiltro] = useState('');
  const [aviso, setAviso] = useState('');
  const todosRef = useRef<HTMLInputElement>(null);

  const elegidos = useMemo(() => new Set(parsearPrefijos(value)), [value]);

  // Lo ya guardado que ya no figura en el catálogo se conserva y se puede destildar.
  const lista = useMemo(() => {
    const conocidos = new Set(options.map((o) => o.value));
    const extras = Array.from(elegidos)
      .filter((v) => !conocidos.has(v))
      .map((v) => ({ value: v, label: `${v} (actual, sin catálogo)`, detail: '' }));
    return [...options, ...extras].sort((a, b) => Number(a.value) - Number(b.value));
  }, [options, elegidos]);

  const visibles = useMemo(() => {
    const t = filtro.trim().toLowerCase();
    if (!t) return lista;
    return lista.filter(
      (o) =>
        o.value.startsWith(t) ||
        o.label.toLowerCase().includes(t) ||
        (o.detail || '').toLowerCase().includes(t),
    );
  }, [lista, filtro]);

  const marcadosVisibles = visibles.filter((o) => elegidos.has(o.value)).length;
  const todosMarcados = visibles.length > 0 && marcadosVisibles === visibles.length;

  useEffect(() => {
    if (todosRef.current) {
      todosRef.current.indeterminate = marcadosVisibles > 0 && !todosMarcados;
    }
  }, [marcadosVisibles, todosMarcados]);

  const emitir = (siguiente: Set<string>): boolean => {
    const texto = unirPrefijos(siguiente);
    if (maxLength && texto.length > maxLength) {
      setAviso(`No entran más prefijos: la columna admite hasta ${maxLength} caracteres.`);
      return false;
    }
    setAviso('');
    onChange(texto);
    return true;
  };

  const alternar = (v: string) => {
    const sig = new Set(elegidos);
    if (sig.has(v)) sig.delete(v);
    else sig.add(v);
    emitir(sig);
  };

  const alternarTodos = () => {
    const sig = new Set(elegidos);
    if (todosMarcados) visibles.forEach((o) => sig.delete(o.value));
    else visibles.forEach((o) => sig.add(o.value));
    emitir(sig);
  };

  return (
    <div className={styles.picker}>
      <div className={styles.barra}>
        <input
          type="text"
          className={styles.buscar}
          placeholder="Filtrar prefijos…"
          value={filtro}
          disabled={disabled}
          onChange={(e) => setFiltro(e.target.value)}
          aria-label="Filtrar prefijos"
        />
        <span className={styles.contador}>
          {elegidos.size} elegido{elegidos.size === 1 ? '' : 's'}
        </span>
      </div>

      <label className={`${styles.fila} ${styles.filaTodos}`}>
        <input
          ref={todosRef}
          type="checkbox"
          checked={todosMarcados}
          disabled={disabled || visibles.length === 0}
          onChange={alternarTodos}
          aria-label={`${name}-todos`}
        />
        <span className={styles.texto}>
          <strong>Todos los prefijos</strong>
          {filtro.trim() ? <span className={styles.detalle}> (los {visibles.length} filtrados)</span> : null}
        </span>
      </label>

      <ul className={styles.lista} role="group" aria-label="Prefijos de práctica">
        {visibles.length === 0 ? <li className={styles.vacio}>Ningún prefijo coincide.</li> : null}
        {visibles.map((o) => (
          <li key={o.value}>
            <label className={styles.fila}>
              <input
                type="checkbox"
                checked={elegidos.has(o.value)}
                disabled={disabled}
                onChange={() => alternar(o.value)}
                aria-label={`${name}-${o.value}`}
              />
              <span className={styles.texto}>
                <span className={styles.titulo}>{o.label}</span>
                {o.detail ? <span className={styles.detalle}>{o.detail}</span> : null}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className={styles.pie}>
        <span>
          Se guarda así: <code>{unirPrefijos(elegidos) || '(vacío)'}</code>
        </span>
        {elegidos.size > 0 && !disabled ? (
          <button type="button" className={styles.limpiar} onClick={() => emitir(new Set())}>
            Quitar todos
          </button>
        ) : null}
      </div>
      {aviso ? <div className={styles.aviso}>{aviso}</div> : null}
    </div>
  );
}
