import type { FilaTurnoAgenda } from '@/app/components/Agenda/AgendaTurnoTablaCeldas';

/** Clase CSS de fila según estado del turno y avance de horarios (llegada → ingreso → cierre). */
export function claseFilaAgenda(
	styles: Record<string, string>,
	row: FilaTurnoAgenda,
	opts: { libre: boolean; cancelado: boolean; esSobreturno?: boolean },
): string {
	if (opts.libre && !opts.cancelado) return styles.rowLibre ?? '';
	if (opts.cancelado) return styles.rowCancelado ?? '';
	if (row.estado === 'ATENDIDO' || row.horaSalida) return styles.rowCerrado ?? '';
	if (row.horaIngreso) return styles.rowIngreso ?? '';
	if (row.horaLlegada) return styles.rowLlegada ?? '';
	if (opts.esSobreturno) return styles.rowSobreturno ?? '';
	return styles.rowOcupado ?? '';
}
