/**
 * Código de sector receptor = imSectores.Valor (ya abreviado: CIRA, CM1, AUD).
 * ValorServicio es la etiqueta de servicio anexada (CIR, CLI), no un alias a inventar.
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

function compact(v: unknown): string {
	return fold(v).replace(/\s+/g, '');
}

/** Login / URL: mismo código de sector (CM1 → CM1, CIRA → CIRA). */
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
 * ¿El destino del catálogo coincide con el código o el texto de catálogo?
 * Sin stems inventados (CIRUGIA ≠ CIR).
 */
export function sectorCoincideServicio(
	sectorLogin: SectorLoginLike,
	srv: ReceptorLike,
): boolean {
	const id = compact(sectorLogin?.idSector);
	const codeVal = compact(srv?.valor);
	const codeSvc = compact(srv?.valorServicio);
	if (id && (id === codeVal || id === codeSvc)) return true;

	const needle = fold(
		sectorLogin?.descripcion || sectorLogin?.descripcionSector || '',
	);
	if (!needle) return false;
	const blob = `${fold(srv?.valor)} ${fold(srv?.valorServicio)} ${fold(srv?.descripcion)} ${fold(srv?.descripcionServicio)}`;
	if (compact(needle) && (compact(needle) === codeVal || compact(needle) === codeSvc)) {
		return true;
	}
	return needle.length >= 4 && blob.includes(needle);
}

export function resolveReceptorPorTipo(
	tipo: { descripcion?: string | null; idPractica?: number | string | null } | null,
	list: ReceptorLike[],
): string {
	if (!tipo || !list?.length) return '';
	const byCatalog = list.find((s) =>
		sectorCoincideServicio({ descripcion: tipo.descripcion }, s),
	);
	if (byCatalog) return String(byCatalog.valor || '').trim();
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
