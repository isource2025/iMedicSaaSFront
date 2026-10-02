'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Vista agrupada de estudios ("una solicitud = N prácticas"), en BETA.
 *
 * Conviven dos circuitos y por defecto se ve SIEMPRE el de siempre:
 *  - de siempre: un pedido = una práctica (/api/estudios)
 *  - agrupado:   una solicitud = N prácticas (/api/solicitudes-estudios)
 *
 * La vista agrupada es opt-in por navegador, con un link discreto al pie de
 * Estudios y de la Bandeja. También se puede forzar a mano:
 *    localStorage.setItem('imedic.solicitudesMulti', '1')   // activar
 *    localStorage.setItem('imedic.solicitudesMulti', '0')   // desactivar
 * o, para todos por defecto, NEXT_PUBLIC_SOLICITUDES_MULTI=1 (no recomendado aún).
 */
export const SOLICITUDES_MULTI_STORAGE_KEY = 'imedic.solicitudesMulti';

const DEFAULT_ENTORNO = process.env.NEXT_PUBLIC_SOLICITUDES_MULTI === '1';

export function solicitudesMultiHabilitado(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const local = window.localStorage.getItem(SOLICITUDES_MULTI_STORAGE_KEY);
      if (local === '0') return false;
      if (local === '1') return true;
    } catch {
      /* storage no disponible */
    }
  }
  return DEFAULT_ENTORNO;
}

export function setSolicitudesMulti(valor: boolean): void {
  try {
    window.localStorage.setItem(SOLICITUDES_MULTI_STORAGE_KEY, valor ? '1' : '0');
  } catch {
    /* storage no disponible: el cambio vale solo para esta pantalla */
  }
}

/**
 * Para componentes: arranca con el valor del entorno (igual en servidor y cliente) y se corrige
 * tras montar si el navegador tiene una preferencia propia. Devuelve [activo, cambiar].
 */
export function useSolicitudesMulti(): [boolean, (valor: boolean) => void] {
  const [habilitado, setHabilitado] = useState(DEFAULT_ENTORNO);
  useEffect(() => {
    setHabilitado(solicitudesMultiHabilitado());
  }, []);
  const cambiar = useCallback((valor: boolean) => {
    setSolicitudesMulti(valor);
    setHabilitado(valor);
  }, []);
  return [habilitado, cambiar];
}
