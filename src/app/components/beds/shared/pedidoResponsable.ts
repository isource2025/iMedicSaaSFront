export type PedidoResponsable = {
	RealizadorNombre?: string | null;
	MatriculaRealizador?: number | null;
	NombreToma?: string | null;
	MatriculaToma?: number | null;
};

/**
 * Profesional que respondió un pedido o interconsulta.
 * El backend resuelve el nombre desde facturación, la toma del pedido o el
 * operador que cargó el resultado; los pedidos migrados de iMedic escritorio
 * pueden llegar solo con matrícula.
 */
export function autorRespuesta(row: PedidoResponsable): string | null {
	const nombre = row.RealizadorNombre || row.NombreToma;
	if (nombre && String(nombre).trim()) return String(nombre).trim();
	const matricula = row.MatriculaRealizador ?? row.MatriculaToma;
	return matricula ? `Matrícula ${matricula}` : null;
}
