/** Texto y orden estándar de tablas de movimientos (cama / admisión). */

import { clarionDateToISO, horaMostrada, isoCalendarioADmy } from '../../../utils/dateUtils';

export type MovimientoEstadoUi = 'Actual' | 'Traslado' | 'Internado' | 'Egreso';

export type MovimientoRowLike = Record<string, unknown>;

export function esCodigoCrudo(valor: string): boolean {
	const v = valor.trim();
	if (!v) return true;
	if (/^\d+$/.test(v)) return true;
	if (/^[A-Z][0-9][0-9A-Z.]{1,6}$/i.test(v)) return true;
	return false;
}

export function nombreOperador(m: MovimientoRowLike): string {
	const lower = Object.fromEntries(
		Object.entries(m).map(([k, v]) => [k.toLowerCase(), v]),
	);
	const candidatos = [
		lower.operadornombre,
		lower.nombreoperador,
		m.OperadorNombre,
		m.operadorNombre,
		m.NombreOperador,
		m.nombreOperador,
	];
	for (const c of candidatos) {
		const nombre = String(c || '').trim();
		if (nombre && !esCodigoCrudo(nombre)) return nombre;
	}
	const raw = String(m.Operador || m.operador || lower.operador || '').trim();
	if (raw && !esCodigoCrudo(raw) && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(raw)) return raw;
	return '—';
}

export function diagnosticoTexto(m: MovimientoRowLike): string {
	const desc = String(m.DiagnosticoDescripcion || m.diagnosticoDescripcion || '').trim();
	if (desc && !esCodigoCrudo(desc)) return desc;
	const code = String(m.Diagnostico || m.diagnostico || '').trim();
	if (code && !esCodigoCrudo(code)) return code;
	return code || '—';
}

export function disposicionTexto(
	m: MovimientoRowLike,
	catalogo: Map<number, string>,
): string {
	const desc = String(
		m.DisposicionEgresoDescripcion || m.disposicionEgresoDescripcion || '',
	).trim();
	if (desc && !esCodigoCrudo(desc)) return desc;
	const code = Number(m.DisposicionEgreso ?? m.disposicionEgreso);
	if (Number.isFinite(code) && code > 0) {
		const fromCat = catalogo.get(code);
		if (fromCat) return fromCat;
	}
	return '—';
}

export function catalogoDisposiciones(
	rows: Array<{ Valor?: number | string; Descripcion?: string }>,
): Map<number, string> {
	const next = new Map<number, string>();
	for (const r of rows) {
		if (Number(r.Valor) > 0 && String(r.Descripcion || '').trim()) {
			next.set(Number(r.Valor), String(r.Descripcion).trim());
		}
	}
	if (!next.has(1)) next.set(1, 'ALTA MEDICA');
	if (!next.has(2)) next.set(2, 'DERIVADO');
	if (!next.has(3)) next.set(3, 'DEFUNCION');
	if (!next.has(4)) next.set(4, 'ALTA VOLUNTARIA');
	return next;
}

export function etiquetaCama(m: MovimientoRowLike): string {
	return (
		String(m.NombreCama || m.NumeroCama || m.ValorHabitacionCama || m.bedId || '').trim() || '—'
	);
}

export function etiquetaSector(m: MovimientoRowLike): string {
	return String(m.NombreSector || m.ValorSector || '').trim() || '—';
}

export function movimientoAbierto(m: MovimientoRowLike): boolean {
	const iso = String(m.FechaEgresoISO || '').trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return false;
	return !(Number(m.FechaEgreso) > 0);
}

function padDmy(raw: string): string {
	const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
	if (!m) return raw;
	return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
}

export function formatFechaHoraMovimiento(
	fechaIso?: unknown,
	horaIso?: unknown,
	fechaClarion?: unknown,
	horaClarion?: unknown,
): string {
	const iso = String(fechaIso || '').trim();
	const fecha = /^\d{4}-\d{2}-\d{2}/.test(iso)
		? isoCalendarioADmy(iso)
		: clarionDateToISO(fechaClarion as number)
			? isoCalendarioADmy(clarionDateToISO(fechaClarion as number))
			: '';
	if (!fecha || fecha === '—') return '—';
	const hora = horaMostrada((horaIso as string) || (horaClarion as string | number) || null);
	if (!hora || hora === '—') return padDmy(fecha);
	return `${padDmy(fecha)} ${hora}`;
}

function tsIngreso(m: MovimientoRowLike): number {
	const iso = String(m.FechaAdmisionISO || '').trim();
	const fecha = /^\d{4}-\d{2}-\d{2}/.test(iso)
		? iso.slice(0, 10)
		: clarionDateToISO(m.FechaAdmision as number) || '';
	const horaRaw = horaMostrada((m.HoraAdmisionISO as string) || (m.HoraAdmision as string | number) || null);
	const hora = horaRaw !== '—' ? horaRaw : '00:00';
	if (!fecha) return 0;
	const t = Date.parse(`${fecha}T${hora}:00`);
	return Number.isFinite(t) ? t : 0;
}

/** Actual primero; el resto de más reciente a más antiguo. */
export function ordenarMovimientos<T extends MovimientoRowLike>(rows: T[]): T[] {
	return [...rows].sort((a, b) => {
		const aOpen = movimientoAbierto(a) ? 1 : 0;
		const bOpen = movimientoAbierto(b) ? 1 : 0;
		if (aOpen !== bOpen) return bOpen - aOpen;
		return tsIngreso(b) - tsIngreso(a);
	});
}

/**
 * Actual = internación vigente (sin egreso, primero).
 * Egreso = último movimiento ya cerrado.
 * Internado = ingreso original (el más antiguo).
 * Traslado = cambios de cama intermedios.
 */
export function clasificarEstadoMovimiento(
	m: MovimientoRowLike,
	idx: number,
	list: MovimientoRowLike[],
): MovimientoEstadoUi {
	const abierto = movimientoAbierto(m);
	if (idx === 0) return abierto ? 'Actual' : 'Egreso';
	if (idx === list.length - 1) return 'Internado';
	return 'Traslado';
}

export function fechaHoraIngreso(m: MovimientoRowLike): string {
	return formatFechaHoraMovimiento(m.FechaAdmisionISO, m.HoraAdmisionISO, m.FechaAdmision, m.HoraAdmision);
}

export function fechaHoraEgreso(m: MovimientoRowLike): string {
	return formatFechaHoraMovimiento(m.FechaEgresoISO, m.HoraEgresoISO, m.FechaEgreso, m.HoraEgreso);
}
