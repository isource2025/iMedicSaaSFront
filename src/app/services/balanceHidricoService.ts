import { apiFetch } from '@/app/utils/authFetch';
import type {
	BalanceHidrico,
	BalanceHidricoPayload,
	BalanceHidricoResumen,
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
