export type PedidoResponsable = {
	RealizadorNombre?: string | null;
	MatriculaRealizador?: number | null;
	NombreToma?: string | null;
	MatriculaToma?: number | null;
	CodOperadorResultado?: number | null;
	CodOperadorToma?: number | null;
};

export type PedidoSolicitante = {
	MatriculaSolicitante?: number | null;
	MedicoSolicitante?: number | null;
};

export type UsuarioSesionIds = {
	matricula: number | null;
	valorPersonal: number | null;
	codOperador: number | null;
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

export function idsSesionUsuario(usuario: UsuarioSesionIds | null | undefined): number[] {
	if (!usuario) return [];
	const ids: number[] = [];
	for (const v of [usuario.matricula, usuario.valorPersonal, usuario.codOperador]) {
		if (v != null && Number.isFinite(v) && v > 0 && !ids.includes(v)) ids.push(v);
	}
	return ids;
}

/** True si el usuario de sesión es quien dio la respuesta (estudio o interconsulta). */
export function esAutorRespuesta(
	row: PedidoResponsable | null | undefined,
	usuario: UsuarioSesionIds | null | undefined,
): boolean {
	if (!row) return false;
	const ids = idsSesionUsuario(usuario);
	if (!ids.length) return false;
	const autores = [
		row.MatriculaRealizador,
		row.MatriculaToma,
		row.CodOperadorResultado,
		row.CodOperadorToma,
	];
	return autores.some((a) => {
		const n = Number(a);
		return Number.isFinite(n) && n > 0 && ids.includes(n);
	});
}

/** True si el usuario de sesión es quien solicitó el pedido / interconsulta. */
export function esSolicitante(
	row: PedidoSolicitante | null | undefined,
	usuario: UsuarioSesionIds | null | undefined,
): boolean {
	if (!row) return false;
	const ids = idsSesionUsuario(usuario);
	if (!ids.length) return false;
	const autor = Number(row.MatriculaSolicitante ?? row.MedicoSolicitante);
	return Number.isFinite(autor) && autor > 0 && ids.includes(autor);
}
