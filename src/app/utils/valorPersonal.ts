/**
 * Normaliza identificadores de personal/operador que vienen mezclados como string o number
 * (localStorage / contexto) a un número finito, probando candidatos en orden.
 */
export function parseValorPersonalId(
	...candidates: Array<string | number | undefined | null>
): number | undefined {
	for (const v of candidates) {
		if (v == null || v === '') continue;
		if (typeof v === 'number' && Number.isFinite(v)) return v;
		const n = parseInt(String(v).trim(), 10);
		if (Number.isFinite(n)) return n;
	}
	return undefined;
}
