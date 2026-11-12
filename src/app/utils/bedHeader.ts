import type { Bed } from '../types/beds';

/** Snapshot liviano para headers de detalle/modales (evita re-fetch). */
export type PatientHeaderSnapshot = {
	nombre?: string;
	documento?: string;
	sexo?: string;
	sector?: string;
	numeroCama?: string;
	cobertura?: string;
	fechaIngresoSQL?: string;
	horaIngresoSQL?: string;
	/** Datetime ISO/SQL combinado si existe */
	fechaAdmisionS?: string;
	/** YYYY-MM-DD */
	fechaNacimiento?: string;
	numeroAfiliado?: string;
	numeroInternacion?: string;
};

/** Edad en años desde YYYY-MM-DD (o DD/MM/YYYY); null si no es válida. */
export function edadDesdeFecha(fecha?: string | null): number | null {
	const s = String(fecha || '').trim();
	const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	const ar = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
	const nac = iso
		? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
		: ar
			? new Date(Number(ar[3]), Number(ar[2]) - 1, Number(ar[1]))
			: null;
	if (!nac || Number.isNaN(nac.getTime())) return null;
	const hoy = new Date();
	let edad = hoy.getFullYear() - nac.getFullYear();
	const m = hoy.getMonth() - nac.getMonth();
	if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
	return edad >= 0 && edad < 130 ? edad : null;
}

export function bedToHeaderSnapshot(bed: Partial<Bed> | null | undefined): PatientHeaderSnapshot | null {
	if (!bed) return null;
	const nombre = String(bed.NombrePaciente || '').trim();
	const documento = String(bed.documentoPaciente || '').trim();
	if (!nombre && !documento && !(bed.numeroVisita || bed.NumeroVisita)) return null;

	return {
		nombre: nombre || undefined,
		documento: documento || undefined,
		sexo: String(bed.SexoPaciente || bed.descripcionSexo || '').trim() || undefined,
		sector: String(bed.sector || '').trim() || undefined,
		numeroCama: String(bed.numeroCama || '').trim() || undefined,
		cobertura: String(bed.razonSocialCliente || '').trim() || undefined,
		fechaIngresoSQL: String(bed.fechaIngresoSQL || '').trim() || undefined,
		horaIngresoSQL: String(bed.horaIngresoSQL || '').trim() || undefined,
		fechaNacimiento: String(bed.fechaNacimientoPaciente || '').trim() || undefined,
		numeroAfiliado: String(bed.numeroAfiliado || '').trim() || undefined,
		numeroInternacion: String(bed.numeroInternacion || '').trim() || undefined,
	};
}

export function hasUsableHeader(h?: PatientHeaderSnapshot | null): boolean {
	if (!h) return false;
	return Boolean(h.nombre || h.documento || h.sector || h.numeroCama);
}
