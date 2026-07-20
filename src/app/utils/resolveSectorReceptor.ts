/**
 * Resuelve el código de servicio receptor (imServicios.Valor) a partir del
 * sector de login (imSectores) y el catálogo de receptores.
 */
export type SectorLoginLike = {
	idSector?: string | null;
	descripcion?: string | null;
	descripcionSector?: string | null;
} | null;

export type ReceptorLike = {
	valor: string;
	descripcion?: string;
};

export function resolveSectorReceptor(
	sectorLogin: SectorLoginLike,
	list: ReceptorLike[],
): string {
	if (!list?.length) return '';
	const id = String(sectorLogin?.idSector || '')
		.trim()
		.toUpperCase();
	const desc = String(sectorLogin?.descripcion || sectorLogin?.descripcionSector || '')
		.trim()
		.toUpperCase();

	const byValor = list.find((s) => String(s.valor || '').trim().toUpperCase() === id);
	if (byValor) return String(byValor.valor).trim();

	if (desc) {
		const byDescExact = list.find(
			(s) => String(s.descripcion || '').trim().toUpperCase() === desc,
		);
		if (byDescExact) return String(byDescExact.valor).trim();

		const byDescPartial = list.find((s) => {
			const d = String(s.descripcion || '').trim().toUpperCase();
			return d && (desc.includes(d) || d.includes(desc));
		});
		if (byDescPartial) return String(byDescPartial.valor).trim();
	}

	const looksOftal = /OFTAL|OFT\b|^OFT/.test(`${id} ${desc}`);
	if (looksOftal) {
		const oft = list.find((s) => {
			const v = String(s.valor || '').trim().toUpperCase();
			const d = String(s.descripcion || '').trim().toUpperCase();
			return v.startsWith('OFT') || d.includes('OFTAL');
		});
		if (oft) return String(oft.valor).trim();
	}

	return String(list[0]?.valor || '').trim();
}
