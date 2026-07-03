/** IMC = peso (kg) / talla (m)² — talla en centímetros */
export function calcularIMC(
	pesoKg: number | string | null | undefined,
	tallaCm: number | string | null | undefined,
): number | null {
	const peso = typeof pesoKg === 'string' ? parseFloat(pesoKg) : Number(pesoKg);
	const talla = typeof tallaCm === 'string' ? parseFloat(tallaCm) : Number(tallaCm);
	if (!Number.isFinite(peso) || !Number.isFinite(talla) || peso <= 0 || talla <= 0) {
		return null;
	}
	const tallaM = talla / 100;
	return Math.round((peso / (tallaM * tallaM)) * 10) / 10;
}

export function formatIMC(
	pesoKg: number | string | null | undefined,
	tallaCm: number | string | null | undefined,
	imcAlmacenado?: number | string | null,
): string {
	const stored =
		imcAlmacenado != null && String(imcAlmacenado).trim() !== ''
			? Number(imcAlmacenado)
			: null;
	if (stored != null && Number.isFinite(stored) && stored > 0) {
		return String(stored);
	}
	const imc = calcularIMC(pesoKg, tallaCm);
	return imc != null ? String(imc) : '—';
}
