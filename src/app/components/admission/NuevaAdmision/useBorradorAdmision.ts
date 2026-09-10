'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIJO = 'imedic:admision-nueva';
/** Un borrador viejo confunde más de lo que ayuda. */
const VIGENCIA_MS = 12 * 60 * 60 * 1000;
const DEBOUNCE_MS = 600;

interface Borrador<T> {
  guardadoEn: number;
  datos: T;
}

function clave(idUsuario: string | number | null | undefined): string {
  return `${PREFIJO}:${idUsuario ?? 'anon'}`;
}

/**
 * Autoguardado del formulario en localStorage. Los archivos adjuntos no se
 * serializan: si el usuario recarga, vuelve a elegirlos.
 */
export function useBorradorAdmision<T>(
  idUsuario: string | number | null | undefined,
  datos: T,
  habilitado: boolean,
) {
  const [borradorGuardado, setBorradorGuardado] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(clave(idUsuario));
      if (!raw) return;
      const parsed = JSON.parse(raw) as Borrador<T>;
      if (!parsed?.guardadoEn || Date.now() - parsed.guardadoEn > VIGENCIA_MS) {
        localStorage.removeItem(clave(idUsuario));
        return;
      }
      setBorradorGuardado(parsed.datos);
    } catch {
      localStorage.removeItem(clave(idUsuario));
    }
  }, [idUsuario]);

  useEffect(() => {
    if (!habilitado) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        const payload: Borrador<T> = { guardadoEn: Date.now(), datos };
        localStorage.setItem(clave(idUsuario), JSON.stringify(payload));
      } catch {
        /* localStorage lleno o bloqueado: el borrador es una comodidad, no se corta el alta */
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [datos, habilitado, idUsuario]);

  const limpiar = useCallback(() => {
    setBorradorGuardado(null);
    try {
      localStorage.removeItem(clave(idUsuario));
    } catch {
      /* nada que limpiar */
    }
  }, [idUsuario]);

  const descartarAviso = useCallback(() => setBorradorGuardado(null), []);

  return { borradorGuardado, limpiar, descartarAviso };
}
