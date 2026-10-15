import jsPDF from 'jspdf';
import type { EmpresaInfo } from '../services/empresaService';
import type { PedidoEstudio } from '../types/estudios';
import { PdfBloques, type Campo } from './pdfBloques';
import { drawProfesionalFirmaBlock, formatMatricula, withPersonalFirmas, type ProfesionalFirmaInfo } from './pdfExport';
import {
	cleanPdfValue,
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	entregarPDF,
	PDF_COLORS,
	type PDFHeaderOptions,
	type PDFHeaderPatient,
} from './pdfHeader';

export type PDFEstudiosOptions = {
	/** Estudios: solo se exportan los cumplidos. Interconsultas: todas, con su estado. */
	items: PedidoEstudio[];
	tipo?: 'estudio' | 'interconsulta';
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName?: string;
};

export const estudioCumplido = (r: PedidoEstudio) => !!(r.Cumplido || Number(r.IdProtocolo) > 0);

const TEXTOS = {
	estudio: {
		titulo: ['Informe de estudio', 'Informes de estudios'],
		numero: ['N° de estudio', 'N° de estudios'],
		respuesta: 'Informe',
		fecha: 'Fecha del informe',
		autor: 'Informado por',
		sinTexto: 'Informe sin texto cargado.',
		vacio: 'No hay estudios cumplidos en el período seleccionado.',
	},
	interconsulta: {
		titulo: ['Interconsulta', 'Interconsultas'],
		numero: ['N° de pedido', 'N° de pedidos'],
		respuesta: 'Respuesta',
		fecha: 'Fecha de respuesta',
		autor: 'Respondido por',
		sinTexto: 'Respuesta sin texto cargado.',
		vacio: 'No hay interconsultas en el período seleccionado.',
	},
};

function estado(r: PedidoEstudio): string {
	if (estudioCumplido(r)) return 'Cumplido';
	return r.Tomado ? 'Tomado' : 'Pendiente';
}

/** "YYYY-MM-DD[ HH:mm]" → "dd/mm/yyyy  HH:mm". */
function fechaHora(v?: string | null, hora?: string | null): string {
	const s = cleanPdfValue(v);
	const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
	if (!m) return s;
	const h = m[4] ? `${m[4]}:${m[5]}` : cleanPdfValue(hora).slice(0, 5);
	return [`${m[3]}/${m[2]}/${m[1]}`, h].filter(Boolean).join('  ');
}

function nombrePractica(r: PedidoEstudio): string {
	return cleanPdfValue(r.PracticaSolicitada) || cleanPdfValue(r.NomencladorDescripcion) || `Pedido ${r.IdPedido}`;
}

function profesional(
	nombre?: string | null,
	matricula?: number | null,
	especialidad?: string | null,
): ProfesionalFirmaInfo | null {
	const n = cleanPdfValue(nombre);
	if (!n && !formatMatricula(matricula)) return null;
	return { nombre: n || undefined, matricula: matricula ?? undefined, especialidad: cleanPdfValue(especialidad) || undefined };
}

function detalleProfesional(p: ProfesionalFirmaInfo | null | undefined): string {
	if (!p) return '';
	const mat = formatMatricula(p.matricula);
	return [cleanPdfValue(p.nombre).toUpperCase(), mat && `Mat. ${mat}`].filter(Boolean).join('  ·  ');
}

/** Un informe puede responder varias prácticas del mismo pedido (mismo protocolo): se agrupan. */
type Bloque = { items: PedidoEstudio[]; pedido: PedidoEstudio };

function agrupar(items: PedidoEstudio[]): Bloque[] {
	const porClave = new Map<string, PedidoEstudio[]>();
	for (let i = 0; i < items.length; i++) {
		const r = items[i];
		const clave = Number(r.IdProtocolo) > 0 ? `p${r.IdProtocolo}` : `i${i}`;
		porClave.set(clave, [...(porClave.get(clave) ?? []), r]);
	}
	return Array.from(porClave.values())
		.map((lista) => ({ items: lista, pedido: lista[0] }))
		.sort((a, b) =>
			`${a.pedido.FechaPedidoISO}${a.pedido.HoraPedido ?? ''}`.localeCompare(
				`${b.pedido.FechaPedidoISO}${b.pedido.HoraPedido ?? ''}`,
			),
		);
}

/** Líneas en mayúsculas cortas del informe (p. ej. "ECOGRAFIA RENAL") son títulos. */
const esTitulo = (l: string) => l.length <= 70 && /[A-ZÁÉÍÓÚÑ]/.test(l) && l === l.toUpperCase() && !/\d/.test(l);

function textoLimpio(v?: string | null): string {
	return String(v ?? '')
		.replace(/\r\n?/g, '\n')
		.replace(/[ \t]+$/gm, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/** Texto del informe respetando títulos y párrafos. */
function informe(doc: jsPDF, r: PdfBloques, texto: string) {
	const lineH = 4.6;
	for (const linea of texto.split('\n')) {
		const t = linea.trim();
		if (!t) {
			r.espacio(2.2);
			continue;
		}
		if (esTitulo(t)) {
			r.ensure(lineH * 3);
			r.espacio(1.2);
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(10);
			doc.setTextColor(...PDF_COLORS.ink);
			doc.text(t, r.x0, r.y);
			r.y += lineH + 0.8;
			continue;
		}
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9.5);
		doc.setTextColor(...PDF_COLORS.ink);
		for (const l of doc.splitTextToSize(t, r.width) as string[]) {
			r.ensure(lineH + 1);
			doc.text(l, r.x0, r.y);
			r.y += lineH;
		}
	}
	r.espacio(3.5);
}

async function firma(doc: jsPDF, r: PdfBloques, p: ProfesionalFirmaInfo | null | undefined) {
	if (!p) return;
	r.espacio(2);
	r.ensure(47);
	r.y = await drawProfesionalFirmaBlock(doc, p, r.y, { align: 'left', left: r.x1 - 62 });
}

/**
 * PDF de estudios cumplidos: por estudio, primero todo el pedido (quién, cuándo, para qué)
 * y después todo el informe (quién informó, cuándo y el texto), cada uno con su firma.
 */
export async function generarPDFEstudios({ items, tipo = 'estudio', empresaInfo, patient, fileName }: PDFEstudiosOptions) {
	const tx = TEXTOS[tipo];
	const exportados = tipo === 'estudio' ? items.filter(estudioCumplido) : items;
	const bloques = agrupar(exportados);
	const ref = exportados[0];

	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const headerOpts: PDFHeaderOptions = {
		title: tx.titulo[bloques.length === 1 ? 0 : 1],
		empresaInfo,
		emittedAt: new Date(),
		patient: {
			...patient,
			nombre: patient?.nombre || ref?.PacienteNombre,
			numeroDocumento: patient?.numeroDocumento || ref?.PacienteDocumento,
			tipoDocumento: patient?.tipoDocumento || ref?.PacienteTipoDocumento,
			sexo: patient?.sexo || ref?.PacienteSexoDescripcion || ref?.PacienteSexo,
			edad: patient?.edad ?? ref?.PacienteEdad,
			fechaNacimiento: patient?.fechaNacimiento || ref?.PacienteFechaNacimiento,
			cobertura: patient?.cobertura || ref?.ObraSocial,
			ubicacion: patient?.ubicacion || ref?.Ubicacion,
		},
	};
	const r = new PdfBloques(doc);
	r.y = await drawDocumentHeader(doc, headerOpts);

	const firmantes = bloques.flatMap((b) => [
		profesional(b.pedido.MedicoSolicitanteNombre, b.pedido.MatriculaSolicitante, b.pedido.EspecialidadSolicitante),
		estudioCumplido(b.pedido)
			? profesional(
					b.pedido.RealizadorNombre || b.pedido.NombreToma,
					b.pedido.MatriculaRealizador ?? b.pedido.MatriculaToma,
					b.pedido.EspecialidadRealizador,
				)
			: null,
	]);
	const conFirma = await withPersonalFirmas(firmantes);

	if (!bloques.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9.5);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text(tx.vacio, r.x0, r.y + 2);
	}

	for (let i = 0; i < bloques.length; i++) {
		const { items: practicas, pedido: p } = bloques[i];
		const solicitante = conFirma[i * 2];
		const informante = conFirma[i * 2 + 1];

		if (i > 0) {
			r.espacio(4);
			doc.setDrawColor(...PDF_COLORS.line);
			doc.setLineWidth(0.3);
			r.ensure(60);
			doc.line(r.x0, r.y - 4, r.x1, r.y - 4);
			r.espacio(4);
		}
		r.ensure(70);
		const servicio = cleanPdfValue(p.ServicioDescripcion) || cleanPdfValue(p.SectorReceptorNombre);
		r.capitulo(
			tipo === 'interconsulta' && servicio
				? `Interconsulta a ${servicio}`
				: practicas.map(nombrePractica).join('  ·  '),
		);
		r.meta([
			{ label: tx.numero[practicas.length > 1 ? 1 : 0], value: practicas.map((x) => x.IdPedido).join(', ') },
			{ label: 'Código', value: practicas.map((x) => cleanPdfValue(x.CodigoPractica)).filter(Boolean).join(', ') },
			{ label: 'Estado', value: estado(p) },
			{ label: 'Urgencia', value: cleanPdfValue(p.EstadoUrgencia) },
		]);

		r.subtitulo('Pedido');
		const pedido: Campo[] = [
			{ label: 'Fecha del pedido', valor: fechaHora(p.FechaPedidoISO, p.HoraPedido) },
			{ label: 'Sector solicitante', valor: cleanPdfValue(p.SectorSolicitanteNombre) || cleanPdfValue(p.SectorSolicitante) },
			{ label: 'Solicitado por', valor: detalleProfesional(solicitante) },
			{
				label: 'Servicio',
				valor: cleanPdfValue(p.ServicioDescripcion) || cleanPdfValue(p.SectorReceptorNombre) || cleanPdfValue(p.SectorReceptor),
			},
		].filter((c) => c.valor);
		r.campos(pedido);
		const notas = textoLimpio(p.NotasObservacion);
		if (notas) r.parrafo(notas);
		await firma(doc, r, solicitante);

		r.espacio(2);
		r.subtitulo(tx.respuesta);
		const cumplido = estudioCumplido(p);
		const resp: Campo[] = cumplido
			? [
					{ label: tx.fecha, valor: fechaHora(p.FechaResultado) },
					{
						label: 'Cargado',
						valor: p.FechaCargaResultado && p.FechaCargaResultado !== p.FechaResultado ? fechaHora(p.FechaCargaResultado) : '',
					},
					{ label: tx.autor, valor: detalleProfesional(informante) },
					{ label: 'Protocolo N°', valor: cleanPdfValue(p.NroProtocolo) },
				].filter((c) => c.valor)
			: [{ label: 'Tomado por', valor: cleanPdfValue(p.NombreToma) }].filter((c) => c.valor);
		r.campos(resp);
		const texto = textoLimpio(p.TextoResultado);
		if (texto) informe(doc, r, texto);
		else {
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(9);
			doc.setTextColor(...PDF_COLORS.muted);
			doc.text(cumplido ? tx.sinTexto : 'Sin respuesta cargada.', r.x0, r.y);
			r.espacio(6);
		}
		await firma(doc, r, informante);
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);
	entregarPDF(doc, fileName || `${tipo === 'estudio' ? 'Estudios' : 'Interconsultas'}_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`);
}
