/**
 * Destino de pedidos = código de SERVICIO (imServicios.Valor) en IdSectorReceptor.
 * PrefijosPractica del servicio permiten auto-sugerir destino por práctica.
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

function matchEnLista(code: string, list: ReceptorLike[]): ReceptorLike | undefined {
	const id = compact(code);
	if (!id || !list?.length) return undefined;
	return list.find(
		(s) => compact(s.valor) === id || compact(s.valorServicio) === id,
	);
}

/** Coincide código de servicio del catálogo con un valor de sesión/login (legado). */
export function resolveSectorReceptor(
	sectorLogin: SectorLoginLike,
	list: ReceptorLike[],
): string {
	if (!list?.length) return '';
	const id = String(sectorLogin?.idSector || '').trim();
	if (!id) return '';
	const hit = matchEnLista(id, list);
	return hit ? String(hit.valor || '').trim() : '';
}

/**
 * Resuelve el valor a seleccionar en el combo de servicio destino.
 * Prioriza ServicioCodigo; si el pedido tiene un código legado de sector, lo mapea al servicio de la lista.
 */
export function resolveServicioDestinoEnLista(
	stored: string | null | undefined,
	list: ReceptorLike[],
	servicioCodigo?: string | null,
): string {
	const candidates = [servicioCodigo, stored]
		.map((c) => String(c || '').trim())
		.filter(Boolean);
	for (const c of candidates) {
		const hit = matchEnLista(c, list);
		if (hit) return String(hit.valor || '').trim();
	}
	return String(servicioCodigo || stored || '').trim();
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

/** Auto-destino: descripción del tipo o PrefijosPractica del servicio. */
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
	const nombre = String(s.descripcion || s.descripcionServicio || s.valor).trim();
	return `${nombre} (${s.valor})`;
}
