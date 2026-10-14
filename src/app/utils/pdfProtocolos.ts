import jsPDF from 'jspdf';
import type { EmpresaInfo } from '../services/empresaService';
import type { ProtocoloClinico } from '../types/protocolos';
import { PdfBloques, type Campo } from './pdfBloques';
import { drawProfesionalFirmaBlock, formatMatricula, withPersonalFirmas, type ProfesionalFirmaInfo } from './pdfExport';
import {
	cleanPdfValue,
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	PDF_COLORS,
	PDF_CONTENT_TOP,
	type PDFHeaderOptions,
	type PDFHeaderPatient,
} from './pdfHeader';

export type PDFProtocolosOptions = {
	protocolos: ProtocoloClinico[];
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName?: string;
};

/** imFunciones.Valor 1 = especialista (cirujano a cargo): es quien firma el protocolo. */
const FUNCION_ESPECIALISTA = 1;

/** "YYYY-MM-DDTHH:mm:ss" (hora de pared) → partes. */
function partes(v?: string | null): { fecha: string; hora: string; ms: number | null } {
	const m = cleanPdfValue(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
	if (!m) return { fecha: '', hora: '', ms: null };
	const hora = m[4] ? `${m[4]}:${m[5]}` : '';
	const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0));
	return { fecha: `${m[3]}/${m[2]}/${m[1]}`, hora, ms };
}

function duracion(inicio?: string | null, fin?: string | null): string {
	const a = partes(inicio).ms;
	const b = partes(fin).ms;
	if (a == null || b == null || b <= a) return '';
	const min = Math.round((b - a) / 60000);
	const h = Math.floor(min / 60);
	return h ? `${h} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`;
}

/** Los textos de Clarion vienen con relleno de espacios al final de cada línea. */
function textoLimpio(v?: string | null): string {
	return String(v ?? '')
		.replace(/\r\n?/g, '\n')
		.replace(/[ \t]+$/gm, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function diagnostico(codigo?: string | null, descripcion?: string | null): string {
	const cod = cleanPdfValue(codigo).toUpperCase();
	const desc = cleanPdfValue(descripcion);
	return desc && cod ? `${desc} (${cod})` : desc || cod;
}

type Integrante = { funcion: number; funcionNombre: string; profesional: ProfesionalFirmaInfo };

/** Equipo de todo el protocolo sin repetir persona+función, ordenado por función. */
function equipoDe(p: ProtocoloClinico): Integrante[] {
	const vistos = new Set<string>();
	const lista: Integrante[] = [];
	for (const prac of p.practicas || []) {
		for (const x of prac.profesionales || []) {
			const clave = `${x.funcion}|${x.valorPersonal}`;
			if (vistos.has(clave)) continue;
			vistos.add(clave);
			lista.push({
				funcion: x.funcion,
				funcionNombre: cleanPdfValue(x.funcionNombre) || `Función ${x.funcion}`,
				profesional: {
					nombre: cleanPdfValue(x.apellidoNombre) || 'Sin identificar',
					matricula: x.matricula ?? undefined,
					idPersonal: x.idPersonal ?? x.valorPersonal ?? undefined,
					especialidad: cleanPdfValue(x.especialidad) || undefined,
				},
			});
		}
	}
	return lista.sort((a, b) => a.funcion - b.funcion);
}

function firmantesDe(p: ProtocoloClinico, equipo: Integrante[]): ProfesionalFirmaInfo[] {
	const especialistas = equipo.filter((x) => x.funcion === FUNCION_ESPECIALISTA).map((x) => x.profesional);
	const unicos = new Map<string, ProfesionalFirmaInfo>();
	for (const prof of especialistas) {
		const clave = formatMatricula(prof.idPersonal) || formatMatricula(prof.matricula) || cleanPdfValue(prof.nombre);
		if (!unicos.has(clave)) unicos.set(clave, prof);
	}
	if (unicos.size) return Array.from(unicos.values());
	if (equipo.length) return [equipo[0].profesional];
	return p.operadorNombre ? [{ nombre: p.operadorNombre, matricula: p.operadorMatricula ?? undefined }] : [];
}

/**
 * PDF de protocolos quirúrgicos: header institucional + paciente y, por protocolo
 * (uno por hoja), datos de la práctica, diagnósticos, equipo, descripción y firma del especialista.
 */
export async function generarPDFProtocolos({ protocolos, empresaInfo, patient, fileName }: PDFProtocolosOptions) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const headerOpts: PDFHeaderOptions = {
		title: protocolos.length === 1 ? 'Protocolo quirúrgico' : 'Protocolos quirúrgicos',
		empresaInfo,
		patient,
		emittedAt: new Date(),
	};
	const r = new PdfBloques(doc);
	r.y = await drawDocumentHeader(doc, headerOpts);

	const ordenados = [...protocolos].sort((a, b) =>
		cleanPdfValue(a.fechaHoraFin || a.fecha).localeCompare(cleanPdfValue(b.fechaHoraFin || b.fecha)),
	);
	const equipos = ordenados.map(equipoDe);
	const firmantes = ordenados.map((p, i) => firmantesDe(p, equipos[i]));
	const conFirma = await withPersonalFirmas(firmantes.flat());
	let k = 0;
	const firmasPorProtocolo = firmantes.map((lista) =>
		lista.map(() => conFirma[k++]).filter((f): f is ProfesionalFirmaInfo => Boolean(f)),
	);

	if (!ordenados.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9.5);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('No hay protocolos registrados en el período seleccionado.', r.x0, r.y + 2);
	}

	for (let i = 0; i < ordenados.length; i++) {
		const p = ordenados[i];
		if (i > 0) {
			doc.addPage();
			r.y = PDF_CONTENT_TOP + 2;
		}

		r.capitulo(
			[
				p.numeroProtocolo ? `Protocolo N° ${p.numeroProtocolo}` : 'Protocolo',
				cleanPdfValue(p.tipoDescripcion) || cleanPdfValue(p.tipoProtocolo),
			]
				.filter(Boolean)
				.join('  ·  '),
		);

		const inicio = partes(p.fechaHoraInicio);
		const fin = partes(p.fechaHoraFin);
		const carga = partes(p.fecha);
		r.meta([
			{ label: 'Fecha práctica', value: fin.fecha || inicio.fecha || carga.fecha },
			{ label: 'Hora entrada', value: inicio.hora },
			{ label: 'Hora salida', value: fin.hora },
			{ label: 'Duración', value: duracion(p.fechaHoraInicio, p.fechaHoraFin) },
			{
				label: 'Cargado',
				value: [carga.fecha, carga.hora].filter(Boolean).join('  '),
				sub: cleanPdfValue(p.operadorNombre) || undefined,
			},
		]);

		const diagnosticos: Campo[] = [
			{ label: 'Diagnóstico pre operatorio', valor: diagnostico(p.diagnosticoPre, p.diagnosticoPreDescripcion) },
			{ label: 'Diagnóstico post operatorio', valor: diagnostico(p.diagnosticoPos, p.diagnosticoPosDescripcion) },
			{ label: 'Técnica quirúrgica', valor: cleanPdfValue(p.tecnica) },
		].filter((c) => c.valor);
		if (diagnosticos.length) {
			r.subtitulo('Pre y pos diagnóstico');
			r.campos(diagnosticos);
		}

		const practicas = p.practicas || [];
		if (practicas.length) {
			r.subtitulo(practicas.length === 1 ? 'Práctica realizada' : 'Prácticas realizadas');
			for (const prac of practicas) {
				const desc = cleanPdfValue(prac.descripcion) || String(prac.codigoPractica);
				const cant = prac.cantidad > 1 ? `  ×${prac.cantidad}` : '';
				doc.setFont('helvetica', 'bold');
				doc.setFontSize(9.3);
				const lineas = doc.splitTextToSize(`${desc}${cant}`, r.width - 20) as string[];
				r.ensure(lineas.length * 4.4 + 2);
				doc.setFont('helvetica', 'normal');
				doc.setFontSize(8.2);
				doc.setTextColor(...PDF_COLORS.muted);
				doc.text(String(prac.codigoPractica), r.x0, r.y);
				doc.setFont('helvetica', 'bold');
				doc.setFontSize(9.3);
				doc.setTextColor(...PDF_COLORS.ink);
				doc.text(lineas, r.x0 + 20, r.y, { lineHeightFactor: 1.35 });
				r.y += lineas.length * 4.4 + 1.4;
			}
			r.espacio(2.6);
		}

		const equipo = equipos[i];
		if (equipo.length) {
			r.subtitulo('Equipo quirúrgico');
			const colFuncion = 34;
			for (const x of equipo) {
				r.ensure(6);
				doc.setFont('helvetica', 'bold');
				doc.setFontSize(7);
				doc.setTextColor(...PDF_COLORS.muted);
				doc.text(x.funcionNombre.toUpperCase(), r.x0, r.y, { charSpace: 0.3 });
				doc.setFontSize(9);
				doc.setTextColor(...PDF_COLORS.ink);
				const nombre = cleanPdfValue(x.profesional.nombre).toUpperCase();
				doc.text(nombre, r.x0 + colFuncion, r.y);
				const detalle = [
					formatMatricula(x.profesional.matricula) && `Mat. ${formatMatricula(x.profesional.matricula)}`,
					cleanPdfValue(x.profesional.especialidad),
				]
					.filter(Boolean)
					.join('  ·  ');
				if (detalle) {
					const nx = r.x0 + colFuncion + doc.getTextWidth(nombre) + 4;
					doc.setFont('helvetica', 'normal');
					doc.setFontSize(8);
					doc.setTextColor(...PDF_COLORS.muted);
					doc.text(detalle, nx, r.y);
				}
				r.y += 5;
			}
			r.espacio(3);
		}

		const meds = p.medicamentos || [];
		if (meds.length) {
			r.subtitulo('Medicamentos y descartables');
			r.campos(
				meds.map((m) => ({
					label: cleanPdfValue(m.descripcion) || String(m.idProducto),
					valor:
						m.cantidad != null && m.cantidad > 0
							? [String(m.cantidad), cleanPdfValue(m.unidad)].filter(Boolean).join(' ')
							: '-',
				})),
			);
		}

		const texto = textoLimpio(p.texto);
		if (texto) {
			r.subtitulo('Descripción del procedimiento');
			r.parrafo(texto);
		}

		const firmas = firmasPorProtocolo[i];
		if (firmas.length) {
			r.espacio(4);
			r.ensure(47);
			const celdaW = 62;
			let siguiente = r.y;
			for (let j = 0; j < firmas.length; j++) {
				if (j > 0 && j % 3 === 0) {
					r.y = siguiente + 2;
					r.ensure(47);
				}
				const col = j % 3;
				const enFila = Math.min(3, firmas.length - (j - col));
				// Alineadas a la derecha, como firma al pie del protocolo.
				const left = r.x1 - (enFila - col) * celdaW + (celdaW - 56) / 2;
				const fin = await drawProfesionalFirmaBlock(doc, firmas[j], firmas[j].firmaDigital ? r.y : r.y + 19, {
					align: 'left',
					left,
					lineW: 56,
				});
				siguiente = Math.max(siguiente, fin);
			}
			r.y = siguiente;
		}
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);
	doc.save(fileName || `Protocolos_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`);
}
