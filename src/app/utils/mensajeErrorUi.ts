/**
 * Mensajes de API/errores para mostrar en la UI.
 * Nunca muestra SQL crudo ni stack técnico al usuario.
 */
export function mensajeErrorUi(
	error: unknown,
	fallback = 'No se pudo completar la operación. Intentá de nuevo.',
): string {
	const err = error as {
		response?: { data?: { mensaje?: string; message?: string } };
		message?: string;
	};
	const raw = String(
		err?.response?.data?.mensaje ||
			err?.response?.data?.message ||
			err?.message ||
			'',
	).trim();

	if (!raw) return fallback;

	const low = raw.toLowerCase();
	if (
		/violation of primary key/i.test(raw) ||
		/cannot insert duplicate key/i.test(raw) ||
		/duplicate key/i.test(raw) ||
		/pk_imturnos/i.test(raw)
	) {
		if (/imturnos|pk_imturnos/i.test(raw)) {
			return 'Ese horario ya tiene un turno cargado. Recargá la agenda e intentá de nuevo, o elegí otro horario.';
		}
		return 'Ya existe un registro con esos datos. Revisá e intentá de nuevo.';
	}
	if (/timeout|etimeout|esocket/i.test(low)) {
		return 'La operación tardó demasiado. Intentá de nuevo en unos segundos.';
	}
	if (/network error|failed to fetch|econnrefused/i.test(low)) {
		return 'No se pudo conectar con el servidor. Intentá de nuevo.';
	}
	// Evitar volcar mensajes técnicos largos (SQL, stack, etc.)
	if (
		raw.length > 180 ||
		/\b(select|insert|update|delete|dbo\.|constraint|sql server)\b/i.test(raw)
	) {
		return fallback;
	}

	return raw;
}
