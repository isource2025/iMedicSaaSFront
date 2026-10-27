/**
 * Datos de cada sección → entrada de su módulo PDF. Los usan la sección (export individual)
 * y el export de la historia, así los dos salen idénticos.
 */
import type { InterconsultaRow } from '../services/interconsultasService';
import type { PedidoEstudio } from '../types/estudios';
import type { EpicrisisPdfData } from './pdfEpicrisis';
import type { EvolucionPdfItem } from './pdfEvoluciones';
import type { IndicacionPdfItem } from './pdfIndicaciones';

/** Cualquier fila del back o de la sección (interfaces incluidas); se lee por nombre de campo. */
type Fila = object;

const campo = (r: Fila, k: string) => (r as Record<string, unknown>)[k];

const texto = (r: Fila, ...keys: string[]): string | undefined => {
	for (const k of keys) {
		const v = campo(r, k);
		if (v != null && String(v).trim() !== '') return String(v);
	}
	return undefined;
};

const valor = <T = string | number>(r: Fila, ...keys: string[]): T | undefined => {
	for (const k of keys) {
		const v = campo(r, k);
		if (v != null && v !== '') return v as T;
	}
	return undefined;
};

export function esIndicacionSuspendida(x: { suspendida?: unknown; estado?: unknown }): boolean {
	return Boolean(x.suspendida) || String(x.estado ?? '').trim().toUpperCase() === 'S';
}

/** Fila de `getIndicacionesByVisita` (o `IndicacionRow` de la sección). */
export function indicacionParaPdf(r: Fila): IndicacionPdfItem {
	const hijas = campo(r, 'indicacionesHijas');
	const adicionales = Array.isArray(hijas) ? (hijas as Fila[]) : [];
	return {
		fecha: texto(r, 'vigenteDesde'),
		hora: texto(r, 'horaCarga'),
		tipo: texto(r, 'tipoDescripcion', 'tipo'),
		descripcion: texto(r, 'descripcion'),
		cantidad: valor(r, 'cantidad'),
		unidad: texto(r, 'tipoUnidad'),
		frecuencia: texto(r, 'frecuencia'),
		intervalo: valor<number>(r, 'intervalo'),
		observaciones: texto(r, 'observaciones'),
		adicionales: adicionales.map((h) => ({
			descripcion: texto(h, 'descripcion', 'medicamento'),
			cantidad: valor(h, 'cantidad'),
			unidad: texto(h, 'tipoUnidad'),
			forma: texto(h, 'formaAdicional'),
		})),
		profesional: {
			nombre: texto(r, 'fullName') ?? '',
			matricula: valor(r, 'matricula', 'Matricula'),
			idPersonal: valor(r, 'idPersonal'),
			especialidad: texto(r, 'especialidad'),
		},
	};
}

/** Evolución médica, cruda del back (PascalCase) o ya mapeada por la sección (camelCase). */
export function evolucionMedicaParaPdf(r: Fila): EvolucionPdfItem {
	return {
		fecha: texto(r, 'FechaEv', 'fechaEv'),
		hora: texto(r, 'HoraEv', 'horaEv'),
		texto: texto(r, 'Evolucion', 'evolucion'),
		profesional: {
			nombre: texto(r, 'ProfesionalNombreCompleto', 'profesionalNombreCompleto') ?? '',
			matricula: valor(r, 'Matricula', 'matricula'),
			idPersonal: valor(r, 'IdPersonal', 'idPersonal'),
			especialidad: texto(r, 'EspecialidadDescripcion', 'especialidadDescripcion'),
		},
	};
}

/** Evolución de enfermería (imControlesFrecuentes con observaciones). */
export function evolucionEnfermeriaParaPdf(r: Fila): EvolucionPdfItem {
	const nombre = (a: string, b: string) => `${texto(r, a) ?? ''} ${texto(r, b) ?? ''}`.trim();
	return {
		fecha: texto(r, 'FechaControl'),
		hora: texto(r, 'HoraControl'),
		texto: texto(r, 'Observaciones'),
		profesional: {
			nombre: nombre('ProfesionalApellido', 'ProfesionalNombres') || nombre('OperadorApellido', 'OperadorNombres'),
			matricula: valor(r, 'Matricula'),
			idPersonal: valor(r, 'ValorPersonalProfesional'),
		},
	};
}

/** Fila de `imHCEpicrisis` tal como la devuelve el back. */
export function epicrisisParaPdf(x: Fila): EpicrisisPdfData & { idHCEpicrisis: number; idVisita: number; nroHC?: string } {
	return {
		idHCEpicrisis: Number(valor(x, 'IdHCEpicrisis', 'idHCEpicrisis')),
		idVisita: Number(valor(x, 'IdVisita', 'idVisita')),
		nroHC: texto(x, 'NroHC', 'nroHC'),
		fecha: texto(x, 'Fecha', 'fecha'),
		hora: texto(x, 'Hora', 'hora'),
		idSector: texto(x, 'IdSector', 'idSector'),
		sectorDescripcion: texto(x, 'SectorDescripcion', 'sectorDescripcion'),
		profesional: valor(x, 'Profecional', 'profesional'),
		idPersonal: valor(x, 'IdPersonal', 'idPersonal'),
		matricula: valor(x, 'Matricula', 'matricula'),
		profesionalNombreCompleto: texto(x, 'ProfesionalNombreCompleto', 'profesionalNombreCompleto'),
		epicrisis: texto(x, 'Epicrisis', 'epicrisis') ?? '',
		numeroDocumento: valor(x, 'NumeroDocumento', 'numeroDocumento'),
		diagnostico: texto(x, 'Diagnostico', 'diagnostico') ?? '',
		diagnosticoText: texto(x, 'DiagnosticoText', 'diagnosticoText') ?? '',
		diagnosticoDescripcion: texto(x, 'DiagnosticoDescripcion', 'diagnosticoDescripcion'),
		especialidad: texto(x, 'EspecialidadDescripcion', 'especialidad'),
	};
}

export function interconsultaCumplida(row: InterconsultaRow) {
	return !!row.Cumplido || (row.IdProtocolo != null && row.IdProtocolo > 0) || !!row.Respuesta;
}

export function interconsultaComoPedido(row: InterconsultaRow): PedidoEstudio {
	return {
		IdPedido: Number(row.IdPedido || row.IdInterconsulta) || 0,
		IdVisita: row.IdVisita,
		FechaPedidoISO: row.FechaSolicitud,
		HoraPedido: row.HoraSolicitud,
		PracticaSolicitada:
			row.PracticaSolicitada ||
			row.ServicioDescripcion ||
			row.Especialidad ||
			'Interconsulta',
		NotasObservacion: row.Motivo,
		MedicoSolicitanteNombre: row.MedicoSolicitanteNombre,
		MatriculaSolicitante: row.MedicoSolicitante,
		TextoResultado: row.Respuesta || null,
		SectorSolicitante: row.SectorSolicitante,
		SectorSolicitanteNombre: row.SectorSolicitanteNombre,
		SectorReceptor: row.SectorReceptor,
		SectorReceptorNombre: row.SectorReceptorNombre,
		ServicioDescripcion: row.ServicioDescripcion,
		Cumplido: true,
		MatriculaRealizador: row.MatriculaRealizador,
		RealizadorNombre: row.RealizadorNombre,
		MatriculaToma: row.MatriculaToma,
		NombreToma: row.NombreToma,
		CodOperadorResultado: row.CodOperadorResultado,
		CodOperadorToma: row.CodOperadorToma,
		PacienteNombre: row.PacienteNombre,
		PacienteDocumento: row.PacienteDocumento,
		PacienteTipoDocumento: row.PacienteTipoDocumento,
		PacienteSexo: row.PacienteSexo,
		PacienteSexoDescripcion: row.PacienteSexoDescripcion,
		PacienteFechaNacimiento: row.PacienteFechaNacimiento,
		PacienteEdad: row.PacienteEdad,
		ObraSocial: row.ObraSocial,
		Ubicacion: row.Ubicacion,
		TipoAtencion: row.TipoAtencion,
		IdPaciente: row.IdPaciente,
	};
}

export function interconsultaParaPdf(row: InterconsultaRow): PedidoEstudio {
	return {
		...interconsultaComoPedido(row),
		Cumplido: interconsultaCumplida(row),
		Tomado: row.Tomado,
		CodigoPractica: row.CodigoPractica,
		EstadoUrgencia: row.EstadoUrgencia,
		IdProtocolo: row.IdProtocolo,
		ServicioDescripcion: row.ServicioDescripcion || row.Especialidad,
		FechaResultado: row.FechaRespuesta || null,
		FechaCargaResultado: row.FechaCargaRespuesta,
		NroProtocolo: row.NroProtocolo,
		EspecialidadSolicitante: row.EspecialidadSolicitante,
		EspecialidadRealizador: row.EspecialidadRealizador,
	};
}
