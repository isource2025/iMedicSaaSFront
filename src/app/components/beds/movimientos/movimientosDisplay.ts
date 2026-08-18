/** Texto visible en tablas de movimientos (detalle de cama y admisión). */

export function esCodigoCrudo(valor: string): boolean {
	const v = valor.trim();
	if (!v) return true;
	if (/^\d+$/.test(v)) return true;
	if (/^[A-Z][0-9][0-9A-Z.]{1,6}$/i.test(v)) return true;
	return false;
}

export function nombreOperador(m: Record<string, unknown>): string {
	const candidatos = [
		m.OperadorNombre,
		m.operadorNombre,
		m.NombreOperador,
		m.nombreOperador,
	];
	for (const c of candidatos) {
		const nombre = String(c || "").trim();
		if (nombre && !esCodigoCrudo(nombre)) return nombre;
	}
	const raw = String(m.Operador || m.operador || "").trim();
	if (raw && !esCodigoCrudo(raw) && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(raw)) return raw;
	return "—";
}

export function diagnosticoTexto(m: Record<string, unknown>): string {
	const desc = String(
		m.DiagnosticoDescripcion || m.diagnosticoDescripcion || "",
	).trim();
	if (desc && !esCodigoCrudo(desc)) return desc;
	return "—";
}

export function disposicionTexto(
	m: Record<string, unknown>,
	catalogo: Map<number, string>,
): string {
	const desc = String(
		m.DisposicionEgresoDescripcion || m.disposicionEgresoDescripcion || "",
	).trim();
	if (desc && !esCodigoCrudo(desc)) return desc;
	const code = Number(m.DisposicionEgreso ?? m.disposicionEgreso);
	if (Number.isFinite(code) && code > 0) {
		const fromCat = catalogo.get(code);
		if (fromCat) return fromCat;
	}
	return "—";
}

export function catalogoDisposiciones(
	rows: Array<{ Valor?: number | string; Descripcion?: string }>,
): Map<number, string> {
	const next = new Map<number, string>();
	for (const r of rows) {
		if (Number(r.Valor) > 0 && String(r.Descripcion || "").trim()) {
			next.set(Number(r.Valor), String(r.Descripcion).trim());
		}
	}
	if (!next.has(1)) next.set(1, "ALTA MEDICA");
	if (!next.has(2)) next.set(2, "DERIVADO");
	if (!next.has(3)) next.set(3, "DEFUNCION");
	if (!next.has(4)) next.set(4, "ALTA VOLUNTARIA");
	return next;
}
