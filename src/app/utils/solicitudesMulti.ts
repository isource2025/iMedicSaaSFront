'use client';

import { useEffect, useState } from 'react';

/**
 * Interruptor de la "solicitud de estudios con varias prácticas".
 *
 * Mientras se valida en producción conviven dos circuitos:
 *  - nuevo: una solicitud = N prácticas (/api/solicitudes-estudios)
 *  - viejo: un pedido = una práctica (/api/estudios)
 *
 * Prioridad: preferencia del navegador (localStorage) > variable de entorno > activado.
 *  - Apagar para todos:      NEXT_PUBLIC_SOLICITUDES_MULTI=0 (requiere redeploy del front)
 *  - Apagar en este equipo:  localStorage.setItem('imedic.solicitudesMulti', '0')
 *  - Forzar encendido acá:   localStorage.setItem('imedic.solicitudesMulti', '1')
 */
export const SOLICITUDES_MULTI_STORAGE_KEY = 'imedic.solicitudesMulti';

const DEFAULT_ENTORNO = process.env.NEXT_PUBLIC_SOLICITUDES_MULTI !== '0';

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

/**
 * Versión para componentes: arranca con el valor del entorno (igual en servidor y cliente)
 * y se corrige tras montar si el navegador tiene una preferencia propia.
 */
export function useSolicitudesMulti(): boolean {
  const [habilitado, setHabilitado] = useState(DEFAULT_ENTORNO);
  useEffect(() => {
    setHabilitado(solicitudesMultiHabilitado());
  }, []);
  return habilitado;
}
