/**
 * Código de sector receptor (imSectores.Valor). El servicio se deriva
 * de ValorServicio y solo se usa para etiquetar o auto-elegir destino.
 */
export type SectorLoginLike = {
	idSector?: string | null;
	descripcion?: string | null;
	descripcionSector?: string | null;
} | null;

export type ReceptorLike = {
	valor: string;
	descripcion?: string;
	valorServicio?: string;
	descripcionServicio?: string;
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

function compact(v: unknown): string {
	return fold(v).replace(/\s+/g, '');
}

/** Login / URL: mismo código de sector (CM1 → CM1). */
export function resolveSectorReceptor(
	sectorLogin: SectorLoginLike,
	list: ReceptorLike[],
): string {
	if (!list?.length) return '';
	const id = compact(sectorLogin?.idSector);
	if (!id) return '';
	const hit = list.find((s) => compact(s.valor) === id);
	return hit ? String(hit.valor || '').trim() : '';
}

/**
 * Filtra destinos por tipo de estudio: servicio del sector (ValorServicio),
 * descripción o prefijo de práctica — no por igualdad de código de piso.
 */
export function sectorCoincideServicio(
	sectorLogin: SectorLoginLike,
	srv: ReceptorLike,
): boolean {
	const needle = fold(sectorLogin?.descripcion || sectorLogin?.descripcionSector || sectorLogin?.idSector);
	if (!needle) return false;
	const blob = `${fold(srv?.valorServicio)} ${fold(srv?.descripcionServicio)} ${fold(srv?.descripcion)}`;
	if (blob && needle.length >= 4 && blob.includes(needle)) return true;
	if (compact(sectorLogin?.idSector) && compact(sectorLogin?.idSector) === compact(srv?.valorServicio)) {
		return true;
	}
	const s1 = clinicalStem(sectorLogin?.idSector, sectorLogin?.descripcion || sectorLogin?.descripcionSector);
	const s2 = clinicalStem(srv?.valorServicio || srv?.valor, srv?.descripcionServicio || srv?.descripcion);
	return Boolean(s1 && s2 && s1 === s2);
}

export function resolveReceptorPorTipo(
	tipo: { descripcion?: string | null; idPractica?: number | string | null } | null,
	list: ReceptorLike[],
): string {
	if (!tipo || !list?.length) return '';
	const byStem = list.find((s) => sectorCoincideServicio({ descripcion: tipo.descripcion }, s));
	if (byStem) return String(byStem.valor || '').trim();
	const pref = String(tipo.idPractica ?? '')
		.replace(/\D/g, '')
		.padStart(2, '0')
		.slice(0, 2);
	if (!pref) return '';
	const match = list.find((s) => Array.isArray(s.prefijos) && s.prefijos.includes(pref));
	return match ? String(match.valor || '').trim() : '';
}

export function etiquetaSectorReceptor(s: ReceptorLike | null | undefined): string {
	if (!s?.valor) return '';
	const nombre = String(s.descripcion || s.valor).trim();
	const svc = String(s.descripcionServicio || s.valorServicio || '').trim();
	if (svc && compact(svc) !== compact(nombre)) return `${nombre} (${s.valor}) · ${svc}`;
	return `${nombre} (${s.valor})`;
}
