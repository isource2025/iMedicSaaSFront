/** Ítem de catálogo texto (servicios, clases, etc.). */
export type ItemCatalogoTexto = {
	valor?: string | number | null;
	descripcion?: string | null;
};

function limpio(v: unknown): string {
	return String(v ?? '')
		.replace(/\u0000/g, '')
		.trim();
}

/** Claves comparables: trim, mayúsculas, sin ceros a la izquierda si es numérico. */
export function clavesCatalogo(valor: string | number | null | undefined): string[] {
	const raw = limpio(valor);
	if (!raw) return [];
	const keys = new Set<string>([raw, raw.toUpperCase(), raw.toLowerCase()]);
	const compact = raw.replace(/\s+/g, '');
	keys.add(compact);
	keys.add(compact.toUpperCase());
	if (/^\d+$/.test(compact)) {
		keys.add(String(Number(compact)));
		const sinCeros = compact.replace(/^0+/, '');
		if (sinCeros) keys.add(sinCeros);
	}
	return Array.from(keys);
}

function esMismoCodigo(desc: string, codigo: string): boolean {
	if (!desc || !codigo) return false;
	const d = clavesCatalogo(desc);
	return clavesCatalogo(codigo).some((k) => d.includes(k));
}

export function mapaCatalogoTexto(items: ItemCatalogoTexto[] | undefined | null): Map<string, string> {
	const map = new Map<string, string>();
	for (const item of items || []) {
		const raw = item as ItemCatalogoTexto & {
			id?: string | number | null;
			Valor?: string | number | null;
			Descripcion?: string | null;
		};
		const valor = limpio(raw?.valor ?? raw?.Valor ?? raw?.id);
		const desc = limpio(raw?.descripcion ?? raw?.Descripcion);
		if (!valor || !desc || esMismoCodigo(desc, valor)) continue;
		for (const k of clavesCatalogo(valor)) {
			if (!map.has(k)) map.set(k, desc);
		}
	}
	return map;
}

/**
 * Descripción de catálogo para mostrar en UI.
 * Nunca devuelve el código: si no hay descripción real, string vacío.
 */
export function etiquetaCatalogo(
	catalogo: ItemCatalogoTexto[] | Map<string, string> | undefined | null,
	codigo: string | number | null | undefined,
	extraDesc?: string | null,
): string {
	const extra = limpio(extraDesc);
	const code = limpio(codigo);
	if (extra && !esMismoCodigo(extra, code)) return extra;

	const map = catalogo instanceof Map ? catalogo : mapaCatalogoTexto(catalogo);
	if (code) {
		for (const k of clavesCatalogo(code)) {
			const hit = map.get(k);
			if (hit) return hit;
		}
	}
	return '';
}
