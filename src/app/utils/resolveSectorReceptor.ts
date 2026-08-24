/**
 * Resuelve el código de servicio receptor (imServicios.Valor) a partir del
 * sector de login (imSectores). Los códigos no siempre coinciden
 * (ECO vs ECOG, ECOGRAFÍA vs ECOGRAFIA).
 */
export type SectorLoginLike = {
	idSector?: string | null;
	descripcion?: string | null;
	descripcionSector?: string | null;
} | null;

export type ReceptorLike = {
	valor: string;
	descripcion?: string;
	prefijos?: string[];
};

function fold(v: unknown): string {
	return String(v || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Z0-9]+/gi, ' ')
		.trim()
		.toUpperCase()
		.replace(/\s+/g, ' ');
}

const STEMS: { keys: string[]; stem: string }[] = [
	{ keys: ['ECOGRAF', 'ULTRASON', 'ECOG', 'ECHO', 'ECOCARDIO'], stem: 'ECO' },
	{ keys: ['OFTAL', 'OFTALMO'], stem: 'OFTAL' },
	{ keys: ['CARDIO'], stem: 'CARDIO' },
	{ keys: ['LABORATOR'], stem: 'LAB' },
	{ keys: ['RADIOLOG', 'RAYOS'], stem: 'RX' },
	{ keys: ['TOMOGRAF'], stem: 'TOMO' },
	{ keys: ['RESONAN'], stem: 'RMN' },
	{ keys: ['ENDOSCOP'], stem: 'ENDOS' },
	{ keys: ['KINESIO', 'FISIOTER', 'REHABILIT'], stem: 'KINE' },
	{ keys: ['NUTRIC'], stem: 'NUTRI' },
	{ keys: ['HEMOTER'], stem: 'HEMO' },
	{ keys: ['CIRUG'], stem: 'CIR' },
	{ keys: ['GUARDIA', 'EMERGENC'], stem: 'GUARDIA' },
	{ keys: ['CUIDADOS INTENS', 'TERAPIA INTENS'], stem: 'UTI' },
];

function clinicalStem(valor: unknown, descripcion: unknown): string {
	const blob = `${fold(valor)} ${fold(descripcion)}`.trim();
	if (!blob) return '';
	for (const { keys, stem } of STEMS) {
		if (keys.some((k) => blob.includes(k))) return stem;
	}
	const code = fold(valor).replace(/\s+/g, '');
	return code.length >= 3 ? code : '';
}

function codesRelated(a: unknown, b: unknown): boolean {
	const x = fold(a).replace(/\s+/g, '');
	const y = fold(b).replace(/\s+/g, '');
	if (!x || !y) return false;
	if (x === y) return true;
	const min = Math.min(x.length, y.length);
	if (min < 3) return false;
	return x.startsWith(y) || y.startsWith(x);
}

export function sectorCoincideServicio(
	sectorLogin: SectorLoginLike,
	srv: ReceptorLike,
): boolean {
	const id = fold(sectorLogin?.idSector).replace(/\s+/g, '');
	const desc = fold(sectorLogin?.descripcion || sectorLogin?.descripcionSector);
	const v = fold(srv?.valor).replace(/\s+/g, '');
	const d = fold(srv?.descripcion);
	if (!v && !d) return false;
	if (id && v && id === v) return true;
	if (desc && d && desc === d) return true;
	if (desc && d && desc.length >= 4 && d.length >= 4 && (desc.includes(d) || d.includes(desc))) {
		return true;
	}
	if (codesRelated(id, v)) return true;
	const s1 = clinicalStem(sectorLogin?.idSector, sectorLogin?.descripcion || sectorLogin?.descripcionSector);
	const s2 = clinicalStem(srv?.valor, srv?.descripcion);
	return Boolean(s1 && s2 && s1 === s2);
}

export function resolveSectorReceptor(
	sectorLogin: SectorLoginLike,
	list: ReceptorLike[],
): string {
	if (!list?.length) return '';
	const hit = list.find((s) => sectorCoincideServicio(sectorLogin, s));
	return hit ? String(hit.valor || '').trim() : '';
}

/** Destino del pedido: stem clínico del tipo (ECOG → ECO) y, si no hay, prefijo de práctica. */
export function resolveReceptorPorTipo(
	tipo: { descripcion?: string | null; idPractica?: number | string | null } | null,
	list: ReceptorLike[],
): string {
	if (!tipo || !list?.length) return '';
	const byStem = resolveSectorReceptor({ descripcion: tipo.descripcion }, list);
	if (byStem) return byStem;
	const pref = String(tipo.idPractica ?? '')
		.replace(/\D/g, '')
		.padStart(2, '0')
		.slice(0, 2);
	if (!pref) return '';
	const match = list.find((s) => Array.isArray(s.prefijos) && s.prefijos.includes(pref));
	return match ? String(match.valor || '').trim() : '';
}
