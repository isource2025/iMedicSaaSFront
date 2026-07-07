import type { TurnoAdminRow } from '@/app/services/turnosAdminService';

export type TurnoAdminAction = 'editar' | 'rac' | 'cancelar' | 'cerrar' | 'borrar' | 'detalle';

export type TurnoAdminOpcion = {
	id: TurnoAdminAction;
	label: string;
	danger?: boolean;
};

function tienePaciente(row: TurnoAdminRow): boolean {
	return Boolean(row.idPaciente && row.idPaciente > 0);
}

function turnoTieneDatosAtencion(row: TurnoAdminRow): boolean {
	return (
		row.estado === 'ATENDIDO' ||
		Boolean(row.horaSalida) ||
		Boolean(row.horallegada) ||
		Boolean(row.horaIngreso) ||
		row.idClasificacionTriage != null
	);
}

export function opcionesMenuTurnoAdmin(
	row: TurnoAdminRow,
	opts: {
		puedeEditar: boolean;
		puedeEliminar: boolean;
		puedeRac: boolean;
	},
): TurnoAdminOpcion[] {
	const list: TurnoAdminOpcion[] = [];
	const atendido = row.estado === 'ATENDIDO';
	const cancelado = row.estado === 'CANCELADO';
	const ocupado = row.estado === 'OCUPADO';
	const conPac = tienePaciente(row);

	if (opts.puedeEditar && !atendido) {
		list.push({
			id: 'editar',
			label: cancelado || !conPac ? 'Asignar / reasignar' : 'Editar turno',
		});
	}
	if (opts.puedeRac && conPac && (ocupado || atendido)) {
		list.push({ id: 'rac', label: 'RAC de enfermería' });
	}
	if (turnoTieneDatosAtencion(row)) {
		list.unshift({ id: 'detalle', label: 'Ver detalle de atención' });
	}
	if (opts.puedeEditar && ocupado && conPac) {
		list.push({ id: 'cancelar', label: 'Cancelar turno', danger: true });
	}
	if (opts.puedeEditar && ocupado && conPac && !row.horaAtencion) {
		list.push({ id: 'cerrar', label: 'Cerrar turno' });
	}
	if (opts.puedeEliminar && !atendido) {
		list.push({
			id: 'borrar',
			label:
				row.tipoTurno === 1 || row.tipoTurnoLabel === 'SOBRETURNO'
					? 'Eliminar sobreturno'
					: 'Borrar / liberar cupo',
			danger: true,
		});
	}
	return list;
}
