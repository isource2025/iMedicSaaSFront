import type { DatosFiliatoriosPaciente } from '@/app/types/pacienteDatos';
import type { DetailField } from './PedidoDetalleModal';

function txt(value?: string | number | null) {
	const s = value == null ? '' : String(value).trim();
	return s === '' ? null : s;
}

function formatDocumento(row: DatosFiliatoriosPaciente) {
	const numero = txt(row.PacienteDocumento);
	if (!numero) return null;
	const digits = numero.replace(/\D/g, '');
	const formateado = digits ? Number(digits).toLocaleString('es-AR') : numero;
	const tipo = txt(row.PacienteTipoDocumento);
	return tipo ? `${tipo} ${formateado}` : formateado;
}

function formatFechaNacimiento(row: DatosFiliatoriosPaciente) {
	const iso = txt(row.PacienteFechaNacimiento);
	if (!iso) return null;
	const [y, m, d] = iso.slice(0, 10).split('-');
	const fecha = y && m && d ? `${d}/${m}/${y}` : iso;
	return row.PacienteEdad != null ? `${fecha} (${row.PacienteEdad} años)` : fecha;
}

function formatAtencion(row: DatosFiliatoriosPaciente) {
	if (row.TipoAtencion === 'INTERNADO') {
		const ubic = txt(row.Ubicacion);
		return ubic ? `Internado · ${ubic}` : 'Internado';
	}
	if (row.TipoAtencion === 'AMBULATORIO') return 'Ambulatorio';
	return txt(row.TipoAtencion);
}

/**
 * Datos filiatorios del paciente (imPacientes) para el detalle de un pedido,
 * de una interconsulta o de la HC de ingreso. Se devuelven todos los campos:
 * cada vista descarta los vacíos.
 */
export function buildPacienteFields(row: DatosFiliatoriosPaciente): DetailField[] {
	return [
		{ label: 'Paciente', value: txt(row.PacienteNombre), full: true },
		{ label: 'Documento', value: formatDocumento(row) },
		{
			label: 'Sexo',
			value: txt(row.PacienteSexoDescripcion) || txt(row.PacienteSexo),
		},
		{ label: 'Fecha de nacimiento', value: formatFechaNacimiento(row) },
		{ label: 'N° historia clínica', value: txt(row.PacienteNumeroHC) },
		{ label: 'Obra social', value: txt(row.ObraSocial) },
		{ label: 'N° afiliado', value: txt(row.PacienteAfiliado) },
		{ label: 'Domicilio', value: txt(row.PacienteDomicilio), full: true },
		{ label: 'Localidad', value: txt(row.PacienteLocalidad) },
		{ label: 'Teléfono', value: txt(row.PacienteTelefono) },
		{ label: 'Teléfono alternativo', value: txt(row.PacienteTelefonoAlternativo) },
		{ label: 'Email', value: txt(row.PacienteEmail) },
		{ label: 'Atención', value: formatAtencion(row) },
	];
}
