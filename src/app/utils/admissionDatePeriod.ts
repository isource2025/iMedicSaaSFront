/** Fecha local YYYY-MM-DD (evita corrimientos por UTC). */
export function toYMDLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Lunes de la semana calendario que contiene `d` (criterio habitual en ES). */
export function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay(); // 0 dom … 6 sáb
  const offset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offset);
  return copy;
}

export function endOfWeekMonday(d: Date): Date {
  const start = startOfWeekMonday(d);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return end;
}

export type AdmissionPeriodo = 'semana' | 'mes' | 'ano';

export function rangoDesdePeriodo(periodo: AdmissionPeriodo, referencia: Date = new Date()): {
  fechaInicio: string;
  fechaFin: string;
} {
  if (periodo === 'semana') {
    const ini = startOfWeekMonday(referencia);
    const fin = endOfWeekMonday(referencia);
    return { fechaInicio: toYMDLocal(ini), fechaFin: toYMDLocal(fin) };
  }
  if (periodo === 'mes') {
    const y = referencia.getFullYear();
    const m = referencia.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    return { fechaInicio: toYMDLocal(first), fechaFin: toYMDLocal(last) };
  }
  const y = referencia.getFullYear();
  return {
    fechaInicio: `${y}-01-01`,
    fechaFin: `${y}-12-31`,
  };
}

/** dd/mm/yyyy para mostrar en UI */
export function formatDMY(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}
