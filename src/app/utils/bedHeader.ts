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
};

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
	};
}

export function hasUsableHeader(h?: PatientHeaderSnapshot | null): boolean {
	if (!h) return false;
	return Boolean(h.nombre || h.documento || h.sector || h.numeroCama);
}
