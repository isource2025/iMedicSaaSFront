import type { AgendaSlot } from '@/app/services/agendaService';
import type { TurnoAdminRow } from '@/app/services/turnosAdminService';

export function turnoAdminRowToSlot(row: TurnoAdminRow): AgendaSlot {
	const esSt = row.tipoTurno === 1 || row.tipoTurnoLabel === 'SOBRETURNO';
	return {
		hora: row.hora || '—',
		horaClarion: row.horaClarion ?? undefined,
		sector: row.sector || '',
		estado: row.estado,
		status: row.status,
		tipoTurno: row.tipoTurno,
		esSobreturno: esSt,
		idTurno: row.idTurno,
		idPaciente: row.idPaciente,
		pacienteNombre: row.pacienteNombre,
		numeroDocumento: row.numeroDocumento,
		observaciones: row.observaciones,
		motivoCancelacion: row.motivoCancelacion,
		idClasificacionTriage: row.idClasificacionTriage,
		horaLlegada: row.horallegada,
		horaAtencion: row.horaAtencion,
		horaSalida: row.horaSalida,
		sexo: row.sexo,
		fechaNacimiento: row.fechaNacimiento,
		cobertura: row.cobertura,
	};
}
