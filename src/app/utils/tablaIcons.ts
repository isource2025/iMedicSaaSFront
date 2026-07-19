/**
 * Iconos del sistema iconográfico de tablas (public/siostema de iconos de tablas).
 * Asignación L→R por índice: a1..aN / i1..iN / f1..fN.
 *
 * Admisión: hay una entrada nueva al inicio (Ocupaciones) que no estaba en el pack.
 * Por eso el resto corre 1 casillero a la derecha (índice 1 → a1, 2 → a2, …).
 * Ocupaciones reutiliza el ícono de Tipo de Admisión.
 */

export type TablaIconRubro = 'ADMISION' | 'INTERNACION' | 'FACTURACION';

const BASE = '/siostema de iconos de tablas';

const PACK: Record<
	TablaIconRubro,
	{ folder: string; prefix: string; max: number; color: string }
> = {
	ADMISION: { folder: 'tabla de admisiones', prefix: 'a', max: 20, color: '#7889de' },
	INTERNACION: { folder: 'tabla de internaciones', prefix: 'i', max: 14, color: '#8cc63f' },
	FACTURACION: { folder: 'tabla de facturacion', prefix: 'f', max: 10, color: '#e08f72' },
};

export function getTablaIconColor(rubro: TablaIconRubro): string {
	return PACK[rubro].color;
}

function isOcupaciones(descripcion?: string): boolean {
	const d = String(descripcion || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
	return d.includes('ocupacion');
}

function isTipoAdmision(descripcion?: string): boolean {
	const d = String(descripcion || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
	return d.includes('tipo') && d.includes('admis');
}

function iconPath(rubro: TablaIconRubro, iconNumber1Based: number): string {
	const cfg = PACK[rubro];
	const n = ((Math.max(1, iconNumber1Based) - 1) % cfg.max) + 1;
	return encodeURI(`${BASE}/${cfg.folder}/${cfg.prefix}${n}.svg`);
}

export type TablaIconOption = { descripcion?: string };

/**
 * @param indexZeroBased posición L→R en la grilla (0 = primera)
 * @param options lista ordenada (necesaria en ADMISION para alias Ocupaciones → Tipo de Admisión)
 */
export function getTablaIconSrc(
	rubro: TablaIconRubro,
	indexZeroBased: number,
	options?: TablaIconOption[],
): string {
	if (rubro !== 'ADMISION') {
		return iconPath(rubro, indexZeroBased + 1);
	}

	const list = options ?? [];
	const current = list[indexZeroBased];

	// Ocupaciones (entrada nueva): mismo ícono que Tipo de Admisión
	if (isOcupaciones(current?.descripcion)) {
		const tipoIdx = list.findIndex((o) => isTipoAdmision(o.descripcion));
		if (tipoIdx >= 0) {
			// Tras el shift, índice 1 → a1, así que Tipo en índice N → aN
			return iconPath('ADMISION', tipoIdx);
		}
		return iconPath('ADMISION', 19);
	}

	// Shift +1 a la derecha: índice 0 era el pack a1; ahora índice 1 → a1
	if (indexZeroBased <= 0) {
		return iconPath('ADMISION', 1);
	}
	return iconPath('ADMISION', indexZeroBased);
}

export function getTablaIconFallback(): string {
	return '/images/ConfigGral.ico';
}
