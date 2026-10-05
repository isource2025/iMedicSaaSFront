import { apiFetch } from '@/app/utils/authFetch';
import { motivoDeRespuesta } from '@/app/utils/apiError';
import type { DietaControl, DietaControlPayload, TipoDieta } from '../types/dietaControl';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';

export async function obtenerTiposDieta(): Promise<TipoDieta[]> {
	const res = await apiFetch(`${BASE_URL}/dieta-control/tipos`);
	if (!res.ok) throw new Error(await motivoDeRespuesta(res));
	const json = await res.json();
	return Array.isArray(json.data) ? json.data : [];
}

export async function crearDieta(payload: DietaControlPayload): Promise<DietaControl> {
	const res = await apiFetch(`${BASE_URL}/dieta-control`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	if (!res.ok) throw new Error(await motivoDeRespuesta(res));
	return (await res.json()).data;
}

export async function actualizarDieta(
	id: number,
	payload: Partial<DietaControlPayload>,
): Promise<DietaControl> {
	const res = await apiFetch(`${BASE_URL}/dieta-control/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	if (!res.ok) throw new Error(await motivoDeRespuesta(res));
	return (await res.json()).data;
}

export async function eliminarDieta(id: number): Promise<void> {
	const res = await apiFetch(`${BASE_URL}/dieta-control/${id}`, { method: 'DELETE' });
	if (!res.ok) throw new Error(await motivoDeRespuesta(res));
}

/** "2026-09-24" → "24/09/2026" */
export function formatearFecha(fecha: string | null | undefined): string {
	if (!fecha) return '—';
	const [y, m, d] = String(fecha).slice(0, 10).split('-');
	return y && m && d ? `${d}/${m}/${y}` : String(fecha);
}

export function formatearHora(hora: string | null | undefined): string {
	if (!hora) return '—';
	const parts = String(hora).split(':');
	return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : String(hora);
}

/** Las filas que deja la indicación no tienen fecha de dieta: se muestran con la de carga. */
export const fechaEfectiva = (d: DietaControl) => d.FechaDieta || d.FechaCarga;
export const horaEfectiva = (d: DietaControl) => d.HoraDieta || d.HoraCarga;
export const estaSuministrada = (d: DietaControl) => !!d.FechaDieta;
