import type { AdmissionSearchRow } from '@/app/services/admissionSearchService';
import { groupRowsByPatient, sortVisitsByDateDesc } from '@/app/utils/admissionSearchUtils';

export function digitosDeTermino(termino: string): string {
  return String(termino || '').replace(/\D+/g, '');
}

export function numeroVisitaDeTermino(termino: string): number | null {
  const digits = digitosDeTermino(termino);
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  // Si el usuario escribió más que dígitos (ej. "visita 12"), no lo tomamos como nº exacto.
  if (String(termino).trim() !== digits) return null;
  return n;
}

export type ResultadoBusquedaUnificada =
  | { tipo: 'visita'; visita: AdmissionSearchRow }
  | {
      tipo: 'pacientes';
      grupos: Array<{ patient: AdmissionSearchRow; visits: AdmissionSearchRow[] }>;
    };

/**
 * Si el término es un número de visita y hay una fila con ese número, esa es la
 * coincidencia. Si no, agrupamos por paciente para abrir la carpeta.
 */
export function interpretarBusquedaUnificada(
  termino: string,
  rows: AdmissionSearchRow[],
): ResultadoBusquedaUnificada {
  const nv = numeroVisitaDeTermino(termino);
  if (nv != null) {
    const visita = rows.find((r) => Number(r.NumeroVisita) === nv);
    if (visita) return { tipo: 'visita', visita };
  }
  return {
    tipo: 'pacientes',
    grupos: groupRowsByPatient(rows).map((g) => ({
      patient: g.patient,
      visits: sortVisitsByDateDesc(g.visits),
    })),
  };
}
