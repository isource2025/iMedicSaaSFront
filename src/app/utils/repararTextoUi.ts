/**
 * Repara mojibake típico de ñ/acentos (Clarion CP1252 ↔ UTF-8) en el browser.
 * Ej: "ACUÃ'A" / "NU?EZ" / caracteres de reemplazo provenientes de latin1 mal leído.
 */

const MOJIBAKE_MAP: Array<[RegExp, string]> = [
	[/Ã\u0091/g, 'Ñ'],
	[/Ã\u0081/g, 'Á'],
	[/Ã\u0089/g, 'É'],
	[/Ã\u008D/g, 'Í'],
	[/Ã\u0093/g, 'Ó'],
	[/Ã\u009A/g, 'Ú'],
	[/Ã\?/g, 'Ñ'],
	[/Ã‘/g, 'Ñ'],
	[/Ã±/g, 'ñ'],
	[/Ã¡/g, 'á'],
	[/Ã©/g, 'é'],
	[/Ã­/g, 'í'],
	[/Ã³/g, 'ó'],
	[/Ãº/g, 'ú'],
	[/Ã/g, 'Á'],
	[/Ã‰/g, 'É'],
	[/Ã/g, 'Í'],
	[/Ã“/g, 'Ó'],
	[/Ãš/g, 'Ú'],
	[/Ã¼/g, 'ü'],
	[/Ãœ/g, 'Ü'],
	[/Â/g, ''],
];

function looksLikeUtf8Mojibake(s: string): boolean {
	return /Ã.|Â.|PEÃ|[\u0080-\u009F]/.test(s);
}

function latin1ToUtf8(s: string): string | null {
	try {
		const bytes = new Uint8Array(s.length);
		for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
		const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
		if (decoded.includes('\uFFFD')) return null;
		return decoded;
	} catch {
		return null;
	}
}

export function repararTextoUi(texto: unknown): string {
	if (texto == null) return '';
	let s = String(texto);
	if (!s) return s;

	try {
		s = s.normalize('NFC');
	} catch {
		/* keep */
	}

	if (looksLikeUtf8Mojibake(s)) {
		const decoded = latin1ToUtf8(s);
		if (decoded && decoded !== s) s = decoded;
	}

	for (const [re, repl] of MOJIBAKE_MAP) {
		s = s.replace(re, repl);
	}

	try {
		return s.normalize('NFC');
	} catch {
		return s;
	}
}

/** Recorre objetos/arrays de API y repara strings corruptos (nombres, domicilios, etc.). */
export function repararStringsDeepUi<T>(value: T, depth = 0): T {
	if (depth > 8) return value;
	if (typeof value === 'string') {
		if (!/Ã|Â|\uFFFD|[\u0080-\u009F]/.test(value)) return value;
		return repararTextoUi(value) as T;
	}
	if (Array.isArray(value)) {
		return value.map((v) => repararStringsDeepUi(v, depth + 1)) as T;
	}
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			out[k] = repararStringsDeepUi(v, depth + 1);
		}
		return out as T;
	}
	return value;
}
