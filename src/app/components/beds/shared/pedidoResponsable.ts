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
 * pueden llegar solo con una matrícula que no figura en Personal.
 */
export function autorRespuesta(row: PedidoResponsable): string | null {
	const nombre = row.RealizadorNombre || row.NombreToma;
	if (nombre && String(nombre).trim()) return String(nombre).trim();
	const matricula = row.MatriculaRealizador ?? row.MatriculaToma;
	return matricula ? 'Profesional sin identificar' : null;
}

/**
 * Quién tomó el pedido. Si respondieron sin pasar por "tomar",
 * NombreToma puede venir vacío: en ese caso usar quien respondió.
 */
export function nombreTomadoPor(
	row: PedidoResponsable & { Tomado?: boolean | null },
	opts?: { cumplido?: boolean },
): string | null {
	const toma = row.NombreToma && String(row.NombreToma).trim();
	if (toma) return toma;
	const cumplido = !!opts?.cumplido;
	if (cumplido || row.Tomado) return autorRespuesta(row);
	return null;
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
