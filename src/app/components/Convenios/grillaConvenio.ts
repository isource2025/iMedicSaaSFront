/**
 * Estado de edición de una pestaña de convenio, sin React: qué celdas cambiaron,
 * qué filas se borran y cuáles se agregan, y cómo se arma el lote para el back.
 *
 * El back valida cada fila completa, así que los cambios guardan una copia de la
 * fila original y el lote manda la fila entera, no solo las celdas tocadas.
 */
import type { ColumnaDef, FilaDetalle, LoteCambios, PestanaDef, ValorCelda } from '@/app/types/convenios';

export type Valores = Record<string, ValorCelda>;

export interface FilaNueva {
	_tmp: string;
	valores: Valores;
}

export interface CambiosGrilla {
	editadas: Record<string, { original: FilaDetalle; valores: Valores }>;
	bajas: string[];
	altas: FilaNueva[];
}

export const sinCambios = (): CambiosGrilla => ({ editadas: {}, bajas: [], altas: [] });

const NUMERICOS = new Set(['Int', 'TinyInt', 'SmallInt', 'Bit', 'Money', 'Real', 'Decimal']);

const esNumerica = (c: ColumnaDef) => NUMERICOS.has(c.sqlType);

/** Número desde lo que escribe el usuario ('12,5' o '12.5'); null si está vacío, NaN si no es número. */
function aNumero(v: ValorCelda | undefined): number | null {
	if (v === null || v === undefined) return null;
	if (typeof v === 'number') return v;
	const s = String(v).trim();
	if (!s) return null;
	const n = Number(s.includes(',') && !s.includes('.') ? s.replace(',', '.') : s);
	return Number.isFinite(n) ? n : NaN;
}

/** Los importes se ven y se guardan con 2 decimales, con coma ('3167,50'). */
export const DECIMALES_IMPORTE = 2;

export function textoImporte(v: ValorCelda | undefined): string {
	const n = aNumero(v);
	if (n === null) return '';
	if (Number.isNaN(n)) return String(v);
	return n.toFixed(DECIMALES_IMPORTE).replace('.', ',');
}

/** Columnas que se ven en la grilla (las ocultas tienen valor fijo). */
export const columnasVisibles = (pestana: PestanaDef): ColumnaDef[] => pestana.columnas.filter((c) => !c.oculta);

export function mismoValor(c: ColumnaDef, a: ValorCelda | undefined, b: ValorCelda | undefined): boolean {
	if (esNumerica(c)) {
		const x = aNumero(a);
		const y = aNumero(b);
		if (x === null || y === null) return x === y;
		return Number.isNaN(x) || Number.isNaN(y) ? String(a) === String(b) : Math.abs(x - y) < 1e-9;
	}
	return String(a ?? '').trim() === String(b ?? '').trim();
}

let secuencia = 0;

export function filaNueva(pestana: PestanaDef, inicial: Valores = {}): FilaNueva {
	const valores: Valores = {};
	for (const c of pestana.columnas) valores[c.name] = c.defecto ?? null;
	secuencia += 1;
	return { _tmp: `nueva-${secuencia}`, valores: { ...valores, ...inicial } };
}

export function valorDeFila(fila: FilaDetalle, c: ColumnaDef): ValorCelda {
	const v = fila[c.name];
	return v === undefined || (typeof v === 'object' && v !== null) ? null : (v as ValorCelda);
}

/** Valor que se ve en pantalla para una fila existente (con su edición pendiente, si la hay). */
export function valorVisible(cambios: CambiosGrilla, fila: FilaDetalle, c: ColumnaDef): ValorCelda {
	const ed = cambios.editadas[fila._id];
	if (ed && c.name in ed.valores) return ed.valores[c.name];
	return valorDeFila(fila, c);
}

export function editarCelda(
	cambios: CambiosGrilla,
	pestana: PestanaDef,
	fila: FilaDetalle,
	columna: string,
	valor: ValorCelda,
): CambiosGrilla {
	const c = pestana.columnas.find((x) => x.name === columna);
	if (!c) return cambios;
	const previo = cambios.editadas[fila._id];
	const valores = { ...(previo?.valores ?? {}) };
	if (mismoValor(c, valor, valorDeFila(fila, c))) delete valores[columna];
	else valores[columna] = valor;

	const editadas = { ...cambios.editadas };
	if (Object.keys(valores).length) editadas[fila._id] = { original: previo?.original ?? fila, valores };
	else delete editadas[fila._id];
	return { ...cambios, editadas };
}

export function editarAlta(cambios: CambiosGrilla, tmp: string, valores: Valores): CambiosGrilla {
	return {
		...cambios,
		altas: cambios.altas.map((a) => (a._tmp === tmp ? { ...a, valores: { ...a.valores, ...valores } } : a)),
	};
}

export function agregarAltas(cambios: CambiosGrilla, nuevas: FilaNueva[]): CambiosGrilla {
	return { ...cambios, altas: [...nuevas, ...cambios.altas] };
}

export function quitarAlta(cambios: CambiosGrilla, tmp: string): CambiosGrilla {
	return { ...cambios, altas: cambios.altas.filter((a) => a._tmp !== tmp) };
}

export function alternarBaja(cambios: CambiosGrilla, id: string): CambiosGrilla {
	const bajas = cambios.bajas.includes(id) ? cambios.bajas.filter((b) => b !== id) : [...cambios.bajas, id];
	return { ...cambios, bajas };
}

export function cantidadCambios(cambios: CambiosGrilla): number {
	const editadas = Object.keys(cambios.editadas).filter((id) => !cambios.bajas.includes(id)).length;
	return editadas + cambios.bajas.length + cambios.altas.length;
}

/** Problema de una celda antes de mandarla (el back vuelve a validar todo). */
export function errorCelda(c: ColumnaDef, valor: ValorCelda | undefined): string | null {
	if (!esNumerica(c)) {
		const s = String(valor ?? '').trim();
		if (c.required && !s) return 'Obligatorio';
		if (c.length && s.length > c.length) return `Máximo ${c.length} caracteres`;
		return null;
	}
	const n = aNumero(valor);
	if (n === null) return c.required ? 'Obligatorio' : null;
	if (Number.isNaN(n)) return 'Tiene que ser un número';
	if (['Int', 'TinyInt', 'SmallInt'].includes(c.sqlType) && !Number.isInteger(n)) return 'Tiene que ser entero';
	if (c.min !== undefined && n < c.min) return `Mínimo ${c.min}`;
	if (c.max !== undefined && n > c.max) return `Máximo ${c.max}`;
	return null;
}

function erroresDeFila(pestana: PestanaDef, valores: (c: ColumnaDef) => ValorCelda | undefined): string[] {
	const out: string[] = [];
	for (const c of pestana.columnas) {
		const e = errorCelda(c, valores(c));
		if (e) out.push(`${c.label}: ${e}`);
	}
	const desde = pestana.columnas.find((c) => c.name === 'Desde');
	const hasta = pestana.columnas.find((c) => c.name === 'Hasta');
	if (desde && hasta) {
		const d = aNumero(valores(desde));
		const h = aNumero(valores(hasta));
		if (d !== null && h !== null && !Number.isNaN(d) && !Number.isNaN(h) && d > h) {
			out.push('"Desde" no puede ser mayor que "Hasta"');
		}
	}
	return out;
}

const filaCompleta = (pestana: PestanaDef, base: (c: ColumnaDef) => ValorCelda | undefined): Valores => {
	const out: Valores = {};
	for (const c of pestana.columnas) {
		const v = base(c);
		out[c.name] = v === undefined ? null : v;
	}
	return out;
};

export function construirLote(pestana: PestanaDef, cambios: CambiosGrilla): LoteCambios {
	const cambiosLote = Object.entries(cambios.editadas)
		.filter(([id]) => !cambios.bajas.includes(id))
		.map(([id, ed]) => ({
			...filaCompleta(pestana, (c) => (c.name in ed.valores ? ed.valores[c.name] : valorDeFila(ed.original, c))),
			_id: id,
		}));
	return {
		altas: cambios.altas.map((a) => filaCompleta(pestana, (c) => a.valores[c.name])),
		cambios: cambiosLote,
		bajas: [...cambios.bajas],
	};
}

/** Errores locales de todo el lote, con la fila a la que pertenecen. */
export function erroresDelLote(pestana: PestanaDef, cambios: CambiosGrilla): string[] {
	const out: string[] = [];
	cambios.altas.forEach((a, i) => {
		erroresDeFila(pestana, (c) => a.valores[c.name]).forEach((e) => out.push(`Fila nueva ${i + 1}: ${e}`));
	});
	Object.entries(cambios.editadas)
		.filter(([id]) => !cambios.bajas.includes(id))
		.forEach(([, ed], i) => {
			erroresDeFila(pestana, (c) => (c.name in ed.valores ? ed.valores[c.name] : valorDeFila(ed.original, c))).forEach((e) =>
				out.push(`Fila modificada ${i + 1}: ${e}`),
			);
		});
	return out;
}
