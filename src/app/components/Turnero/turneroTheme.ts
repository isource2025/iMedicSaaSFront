import type { TurneroColores, TurneroPlantilla } from '@/app/types/turnero';

function parseHex(hex: string): { r: number; g: number; b: number } | null {
	const h = String(hex || '').trim().replace('#', '');
	if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(h)) return null;
	const full =
		h.length === 3
			? h
					.split('')
					.map((c) => c + c)
					.join('')
			: h;
	return {
		r: parseInt(full.slice(0, 2), 16),
		g: parseInt(full.slice(2, 4), 16),
		b: parseInt(full.slice(4, 6), 16),
	};
}

function toHex(r: number, g: number, b: number): string {
	const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
	return `#${[clamp(r), clamp(g), clamp(b)]
		.map((n) => n.toString(16).padStart(2, '0'))
		.join('')}`;
}

export function isColorDark(hex: string): boolean {
	const c = parseHex(hex);
	if (!c) return true;
	return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255 < 0.52;
}

function mix(a: string, b: string, t: number): string {
	const ca = parseHex(a);
	const cb = parseHex(b);
	if (!ca || !cb) return a;
	const u = Math.max(0, Math.min(1, t));
	return toHex(
		ca.r + (cb.r - ca.r) * u,
		ca.g + (cb.g - ca.g) * u,
		ca.b + (cb.b - ca.b) * u,
	);
}

function lighten(hex: string, amount: number): string {
	return mix(hex, '#ffffff', amount / 100);
}

function darken(hex: string, amount: number): string {
	return mix(hex, '#000000', amount / 100);
}

/** Texto legible sobre el fondo dado. */
export function textoContraste(fondo: string): string {
	return isColorDark(fondo) ? '#f8fafc' : '#0f172a';
}

export function normalizarColores(raw: Partial<TurneroColores>): TurneroColores {
	const fondo = String(raw.fondo || '#0f172a');
	return {
		fondo,
		texto: String(raw.texto || textoContraste(fondo)),
		destacado: String(raw.destacado || '#fbbf24'),
		acento: String(raw.acento || '#38bdf8'),
		primario: String(raw.primario || raw.acento || '#059669'),
		autoTarjetas: raw.autoTarjetas !== false,
		superficie: raw.superficie ? String(raw.superficie) : undefined,
		borde: raw.borde ? String(raw.borde) : undefined,
	};
}

export function expandTurneroTheme(colores: TurneroColores): Record<string, string> {
	const c = normalizarColores(colores);
	const dark = isColorDark(c.fondo);
	const auto = c.autoTarjetas !== false;

	const superficie =
		c.superficie || (auto ? (dark ? lighten(c.fondo, 10) : darken(c.fondo, 5)) : c.fondo);
	const superficieAlt =
		auto ? (dark ? lighten(c.fondo, 16) : darken(c.fondo, 9)) : superficie;
	const borde =
		c.borde || (auto ? (dark ? lighten(c.fondo, 22) : darken(c.fondo, 14)) : mix(c.texto, c.fondo, 0.15));
	const bordeSuave = mix(borde, c.fondo, dark ? 0.35 : 0.45);

	return {
		'--t-fondo': c.fondo,
		'--t-texto': c.texto,
		'--t-primario': c.primario,
		'--t-acento': c.acento,
		'--t-destacado': c.destacado,
		'--t-superficie': superficie,
		'--t-superficie-alt': superficieAlt,
		'--t-borde': borde,
		'--t-borde-suave': bordeSuave,
	};
}

export interface TemaRapido {
	id: string;
	label: string;
	colores: TurneroColores;
}

/** Colores por defecto según plantilla (todos los grupos de la UI). */
export const COLORES_POR_PLANTILLA: Record<TurneroPlantilla, TurneroColores> = {
	clasica: normalizarColores({
		fondo: '#0f172a',
		texto: '#f1f5f9',
		destacado: '#fbbf24',
		acento: '#38bdf8',
		primario: '#10b981',
		autoTarjetas: true,
	}),
	moderna: normalizarColores({
		fondo: '#0b1220',
		texto: '#e8eef7',
		destacado: '#ffffff',
		acento: '#7dd3fc',
		primario: '#6366f1',
		autoTarjetas: true,
	}),
	'alto-contraste': normalizarColores({
		fondo: '#000000',
		texto: '#ffffff',
		destacado: '#ffea00',
		acento: '#ffffff',
		primario: '#ffea00',
		autoTarjetas: true,
	}),
};

export function coloresDePlantilla(plantilla: TurneroPlantilla): TurneroColores {
	return { ...COLORES_POR_PLANTILLA[plantilla] };
}

export const TEMAS_RAPIDOS: TemaRapido[] = [
	{
		id: 'clinico-oscuro',
		label: 'Clínico oscuro',
		colores: coloresDePlantilla('clasica'),
	},
	{
		id: 'clinico-verde',
		label: 'Verde institucional',
		colores: normalizarColores({
			fondo: '#052e16',
			texto: '#ecfdf5',
			destacado: '#fde68a',
			acento: '#6ee7b7',
			primario: '#22c55e',
		}),
	},
	{
		id: 'azul-corporativo',
		label: 'Azul corporativo',
		colores: normalizarColores({
			fondo: '#0a1628',
			texto: '#e2e8f0',
			destacado: '#f8fafc',
			acento: '#93c5fd',
			primario: '#3b82f6',
		}),
	},
	{
		id: 'claro-limpio',
		label: 'Claro y limpio',
		colores: normalizarColores({
			fondo: '#f8fafc',
			texto: '#0f172a',
			destacado: '#0f766e',
			acento: '#0369a1',
			primario: '#059669',
		}),
	},
	{
		id: 'alto-contraste',
		label: 'Alto contraste',
		colores: coloresDePlantilla('alto-contraste'),
	},
];

export function aplicarCambioFondo(colores: TurneroColores, fondo: string): TurneroColores {
	const next = { ...colores, fondo };
	if (colores.autoTarjetas !== false) {
		next.superficie = undefined;
		next.borde = undefined;
	}
	return next;
}
