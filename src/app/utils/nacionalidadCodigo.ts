/**
 * imPersonal.Nacionalidad en muchas bases legacy es VARCHAR(2) (código ISO 3166-1 alpha-2).
 * La API de provincias devuelve la descripción de imNacionalidad ("ARGENTINA"), que no cabe.
 */

const stripDiacritics = (s: string) =>
	String(s)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');

/** Descripción (o ya código de 2 letras) → código de 2 caracteres para persistir en imPersonal */
export function nacionalidadDescripcionACodigo(
	raw: string | undefined | null,
	fallback = 'AR',
): string {
	const s0 = String(raw ?? '').trim();
	if (!s0) return fallback;
	if (s0.length <= 2) return s0.toUpperCase();
	const k = stripDiacritics(s0)
		.toUpperCase()
		.replace(/\s+/g, ' ')
		.trim();

	const map: Record<string, string> = {
		ARGENTINA: 'AR',
		'REPUBLICA ARGENTINA': 'AR',
		CHILE: 'CL',
		URUGUAY: 'UY',
		PARAGUAY: 'PY',
		BRASIL: 'BR',
		BRAZIL: 'BR',
		BOLIVIA: 'BO',
		PERU: 'PE',
		COLOMBIA: 'CO',
		VENEZUELA: 'VE',
		ECUADOR: 'EC',
		MEXICO: 'MX',
		ESPANA: 'ES',
		SPAIN: 'ES',
		ITALIA: 'IT',
		FRANCIA: 'FR',
		'ESTADOS UNIDOS': 'US',
		USA: 'US',
		ALEMANIA: 'DE',
		CHINA: 'CN',
		JAPON: 'JP',
		CANADA: 'CA',
		PORTUGAL: 'PT',
	};

	if (/\bARGENTIN/i.test(k)) return 'AR';
	if (/\bCHILE\b/i.test(k)) return 'CL';
	if (/\bURUGUAY/i.test(k)) return 'UY';
	if (/\bPARAGUAY/i.test(k)) return 'PY';
	if (/\bBRASIL|\bBRAZIL/i.test(k)) return 'BR';

	return map[k] || fallback;
}
