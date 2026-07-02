import type { AdmissionSearchRow } from '@/app/services/admissionSearchService';

export function visitSortKey(row: AdmissionSearchRow): string {
	return `${row.FechaAdmision || ''} ${row.HoraAdmision || ''}`.trim();
}

/** Más reciente primero. */
export function sortVisitsByDateDesc(visits: AdmissionSearchRow[]): AdmissionSearchRow[] {
	return [...visits].sort((a, b) => visitSortKey(b).localeCompare(visitSortKey(a)));
}

export function groupRowsByPatient(rows: AdmissionSearchRow[]): {
	patient: AdmissionSearchRow;
	visits: AdmissionSearchRow[];
}[] {
	const map = new Map<number, { patient: AdmissionSearchRow; visits: AdmissionSearchRow[] }>();
	for (const row of rows) {
		if (!map.has(row.IdPaciente)) {
			map.set(row.IdPaciente, { patient: row, visits: [] });
		}
		map.get(row.IdPaciente)!.visits.push(row);
	}
	const list = Array.from(map.values()).map((g) => ({
		patient: g.patient,
		visits: sortVisitsByDateDesc(g.visits),
	}));
	list.sort((a, b) => visitSortKey(b.visits[0]).localeCompare(visitSortKey(a.visits[0])));
	return list;
}
