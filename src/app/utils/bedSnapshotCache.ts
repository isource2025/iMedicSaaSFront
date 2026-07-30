import type { Bed } from '../types/beds';

const memory = new Map<string, Bed>();
const SS_PREFIX = 'imedic:bedSnapshot:';

export function setBedSnapshot(bed: Bed): void {
	if (!bed?.id) return;
	memory.set(bed.id, bed);
	try {
		sessionStorage.setItem(`${SS_PREFIX}${bed.id}`, JSON.stringify(bed));
	} catch {
		/* quota / private mode */
	}
}

export function getBedSnapshot(id: string): Bed | null {
	if (!id) return null;
	const mem = memory.get(id);
	if (mem) return mem;
	try {
		const raw = sessionStorage.getItem(`${SS_PREFIX}${id}`);
		if (!raw) return null;
		const bed = JSON.parse(raw) as Bed;
		if (bed?.id) memory.set(bed.id, bed);
		return bed;
	} catch {
		return null;
	}
}

export function clearBedSnapshot(id?: string): void {
	if (id) {
		memory.delete(id);
		try {
			sessionStorage.removeItem(`${SS_PREFIX}${id}`);
		} catch {
			/* ignore */
		}
		return;
	}
	memory.clear();
}

/** Une snapshot de lista con respuesta de GET /beds/:id (lista suele traer más campos de display). */
export function mergeBedSnapshots(cached: Bed | null, fresh: Bed): Bed {
	if (!cached) return fresh;
	const pick = <T,>(a: T | undefined | null, b: T | undefined | null): T | undefined => {
		if (a != null && String(a).trim() !== '') return a as T;
		if (b != null && String(b).trim() !== '') return b as T;
		return (a ?? b) as T | undefined;
	};

	return {
		...cached,
		...fresh,
		id: fresh.id || cached.id,
		NombrePaciente: pick(fresh.NombrePaciente, cached.NombrePaciente),
		documentoPaciente: pick(fresh.documentoPaciente, cached.documentoPaciente),
		SexoPaciente: pick(fresh.SexoPaciente, cached.SexoPaciente),
		descripcionSexo: pick(fresh.descripcionSexo, cached.descripcionSexo),
		diagnosticoDescripcion: pick(fresh.diagnosticoDescripcion, cached.diagnosticoDescripcion),
		razonSocialCliente: pick(fresh.razonSocialCliente, cached.razonSocialCliente),
		servicioMedicoDescripcion: pick(
			fresh.servicioMedicoDescripcion,
			cached.servicioMedicoDescripcion,
		),
		fechaIngresoSQL: pick(fresh.fechaIngresoSQL, cached.fechaIngresoSQL),
		horaIngresoSQL: pick(fresh.horaIngresoSQL, cached.horaIngresoSQL),
		estadoDescripcion: pick(fresh.estadoDescripcion, cached.estadoDescripcion),
		ubicacionPaciente: pick(fresh.ubicacionPaciente, cached.ubicacionPaciente),
		numeroVisita: Number(fresh.numeroVisita || cached.numeroVisita || 0),
		NumeroVisita: Number(
			fresh.NumeroVisita || cached.NumeroVisita || fresh.numeroVisita || cached.numeroVisita || 0,
		),
		sector: pick(fresh.sector, cached.sector) || '',
		numeroCama: pick(fresh.numeroCama, cached.numeroCama) || '',
		tipoRecurso: fresh.tipoRecurso || cached.tipoRecurso,
	};
}
