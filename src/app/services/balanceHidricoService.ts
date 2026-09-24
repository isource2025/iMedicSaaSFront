import { apiFetch } from '@/app/utils/authFetch';
import type {
	BalanceHidrico,
	BalanceHidricoPayload,
	BalanceHidricoResumen,
	TotalesBalance,
	TurnoEnfermeria,
} from '../types/balanceHidrico';
import { motivoDeRespuesta } from '@/app/utils/apiError';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';

export async function obtenerBalancePorVisitaYFecha(
	numeroVisita: number,
	fecha: string,
): Promise<{ data: BalanceHidrico[]; resumen: BalanceHidricoResumen | null }> {
	const res = await apiFetch(
		`${BASE_URL}/balance-hidrico/${numeroVisita}/byDate?date=${encodeURIComponent(fecha)}`,
	);
	if (!res.ok) throw new Error(await motivoDeRespuesta(res));
	const json = await res.json();
	return {
		data: json.success && Array.isArray(json.data) ? json.data : [],
		resumen: json.resumen ?? null,
	};
}

/** Toda la internación (Clarion: "Mostrar sólo el día seleccionado" destildado). */
export async function obtenerBalancePorVisita(
	numeroVisita: number,
	rango?: { desde?: string; hasta?: string },
): Promise<{ data: BalanceHidrico[]; resumen: BalanceHidricoResumen | null }> {
	const qs = new URLSearchParams();
	if (rango?.desde) qs.set('desde', rango.desde);
	if (rango?.hasta) qs.set('hasta', rango.hasta);
	const q = qs.toString();
	const res = await apiFetch(`${BASE_URL}/balance-hidrico/${numeroVisita}/all${q ? `?${q}` : ''}`);
	if (!res.ok) throw new Error(await motivoDeRespuesta(res));
	const json = await res.json();
	return {
		data: json.success && Array.isArray(json.data) ? json.data : [],
		resumen: json.resumen ?? null,
	};
}

export async function crearBalance(payload: BalanceHidricoPayload): Promise<BalanceHidrico> {
	const res = await apiFetch(`${BASE_URL}/balance-hidrico`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	if (!res.ok) throw new Error(await motivoDeRespuesta(res));
	const json = await res.json();
	return json.data;
}

export async function actualizarBalance(
	id: number,
	payload: Partial<BalanceHidricoPayload>,
): Promise<BalanceHidrico> {
	const res = await apiFetch(`${BASE_URL}/balance-hidrico/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	if (!res.ok) throw new Error(await motivoDeRespuesta(res));
	const json = await res.json();
	return json.data;
}

export async function eliminarBalance(id: number): Promise<void> {
	const res = await apiFetch(`${BASE_URL}/balance-hidrico/${id}`, {
		method: 'DELETE',
	});
	if (!res.ok) throw new Error(await motivoDeRespuesta(res));
}

export function formatearMl(v: number | null | undefined): string {
	if (v == null || Number(v) === 0) return '—';
	return `${Number(v)} ml`;
}

export function formatearHora(hora: string | null | undefined): string {
	if (!hora) return '—';
	const parts = String(hora).split(':');
	if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
	return String(hora);
}

export function nombreProfesional(
	apellido?: string | null,
	nombres?: string | null,
): string {
	if (!apellido && !nombres) return '—';
	if (!apellido) return nombres || '—';
	if (!nombres) return apellido;
	return `${apellido}, ${nombres}`;
}

export function esFilaBalance(medicacion?: string | null): boolean {
	return /^balance/i.test(String(medicacion || '').trim());
}

/** Número sin unidad; 0/null → cadena vacía para no ensuciar la grilla. */
export function formatearNum(v: number | null | undefined): string {
	if (v == null) return '';
	const n = Number(v);
	if (!Number.isFinite(n) || n === 0) return '';
	return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** "2026-09-24" → "24/09/2026" */
export function formatearFechaCorta(fecha: string | null | undefined): string {
	if (!fecha) return '—';
	const s = String(fecha).slice(0, 10);
	const [y, m, d] = s.split('-');
	if (!y || !m || !d) return s;
	return `${d}/${m}/${y}`;
}

// ===== Turnos de enfermería =====
export const TURNOS: { id: TurnoEnfermeria; label: string; rango: string }[] = [
	{ id: 'todos', label: 'Todos', rango: '' },
	{ id: 'manana', label: 'Mañana', rango: '06 – 14 h' },
	{ id: 'tarde', label: 'Tarde', rango: '14 – 22 h' },
	{ id: 'noche', label: 'Noche', rango: '22 – 06 h' },
];

export function turnoDeHora(hora: string | null | undefined): Exclude<TurnoEnfermeria, 'todos'> | null {
	if (!hora) return null;
	const h = parseInt(String(hora).split(':')[0], 10);
	if (!Number.isFinite(h)) return null;
	if (h >= 6 && h < 14) return 'manana';
	if (h >= 14 && h < 22) return 'tarde';
	return 'noche';
}

export function filtrarPorTurno(rows: BalanceHidrico[], turno: TurnoEnfermeria): BalanceHidrico[] {
	if (turno === 'todos') return rows;
	return rows.filter((r) => turnoDeHora(r.Hora) === turno);
}

const n0 = (v: number | null | undefined) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

/** Totales estilo Clarion: suma de "Paso" (volumen efectivo) menos egresos. */
export function sumarTotales(rows: BalanceHidrico[]): TotalesBalance {
	const c: TotalesBalance['porColumna'] = {
		Ing_Par_Ingreso: 0,
		Ing_Par_Paso: 0,
		Ing_Aent_Ingreso: 0,
		Ing_Aent_Paso: 0,
		Ing_Apar_Ingreso: 0,
		Ing_Apar_paso: 0,
		Ing_Tranf_Ingreso: 0,
		Ing_Tranf_paso: 0,
		Egr_Diuresis: 0,
		Egr_Catarsis: 0,
		Egr_SNG_Vomito: 0,
		Egr_Drenajes: 0,
	};
	for (const r of rows) {
		(Object.keys(c) as (keyof typeof c)[]).forEach((k) => {
			c[k] += n0(r[k]);
		});
	}
	const ingresos = c.Ing_Par_Paso + c.Ing_Aent_Paso + c.Ing_Apar_paso + c.Ing_Tranf_paso;
	const egresos = c.Egr_Diuresis + c.Egr_Catarsis + c.Egr_SNG_Vomito + c.Egr_Drenajes;
	return { ingresos, egresos, balance: ingresos - egresos, porColumna: c };
}
