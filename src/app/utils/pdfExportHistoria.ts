/**
 * Export de la historia (visita o carpeta del paciente): un solo PDF con un índice al
 * principio y, en el orden del menú de la cama, el mismo documento que exporta cada
 * sección. Los módulos se corren en modo captura y se unen con pdf-lib.
 */
import jsPDF from 'jspdf';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { catalogoDisposiciones } from '../components/beds/movimientos/movimientosDisplay';
import type { InsumoRow } from '../components/beds/insumos/InsumosTable';
import type { ExportSectionKey, ExportVisitaData } from '../services/admissionSearchService';
import { adjuntosService } from '../services/adjuntosService';
import { getDisposicionesEgreso } from '../services/disposicionEgresoService';
import { obtenerInfoEmpresa, type EmpresaInfo } from '../services/empresaService';
import type { InterconsultaRow } from '../services/interconsultasService';
import type { BalanceHidrico } from '../types/balanceHidrico';
import type { ControlFrecuente } from '../types/controlesFrecuentes';
import type { DietaControl } from '../types/dietaControl';
import type { PedidoEstudio } from '../types/estudios';
import type { ExamenLabCompleto } from '../types/laboratorios';
import type { MedicacionControl } from '../types/medicacionControl';
import type { FacPracticaVisita } from '../types/procedimientos';
import type { ProtocoloClinico } from '../types/protocolos';
import {
	epicrisisParaPdf,
	esIndicacionSuspendida,
	evolucionEnfermeriaParaPdf,
	evolucionMedicaParaPdf,
	indicacionParaPdf,
	interconsultaParaPdf,
} from './pdfAdaptadores';
import { esPdfAdjunto, generarPDFAdjuntos, type AdjuntoPdf } from './pdfAdjuntos';
import { generarPDFAdmision } from './pdfAdmision';
import { generarPDFBalanceHidrico } from './pdfBalanceHidrico';
import { generarPDFControles } from './pdfControles';
import { generarPDFDieta } from './pdfDieta';
import { generarPDFEpicrisis } from './pdfEpicrisis';
import { generarPDFEstudios } from './pdfEstudios';
import { generarPDFEvoluciones } from './pdfEvoluciones';
import { generarPDFHistoriaClinica } from './pdfHCIngreso';
import {
	capturarPDFs,
	cleanPdfValue,
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	entregarPDF,
	PDF_COLORS,
	PDF_CONTENT_TOP,
	PDF_FOOTER_SPACE,
	PDF_MARGIN_X,
	type PdfCapturado,
	type PDFHeaderOptions,
	type PDFHeaderPatient,
} from './pdfHeader';
import { generarPDFIndicaciones } from './pdfIndicaciones';
import { generarPDFInsumos } from './pdfInsumos';
import { generarPDFLaboratorio } from './pdfLaboratorio';
import { generarPDFMedicacion } from './pdfMedicacion';
import { generarPDFMovimientos } from './pdfMovimientos';
import { generarPDFProcedimientos } from './pdfProcedimientos';
import { generarPDFProtocolos } from './pdfProtocolos';
import { fechaCorta } from './pdfTablaDiaria';

type Fila = Record<string, unknown>;

const lista = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

type Contexto = {
	empresaInfo: EmpresaInfo | null;
	patient: PDFHeaderPatient;
	disposiciones: Map<number, string>;
};

/** Un renglón del índice: uno o más documentos del mismo bloque. */
type Bloque = {
	grupo: string;
	titulo: string;
	/** Registros que entran; 0 = el bloque figura en el índice como "sin registros". */
	cantidad: number;
	generar: (c: Contexto) => Promise<unknown>;
	/** PDFs adjuntos que se anexan tal cual después del bloque. */
	anexos?: () => Promise<ArrayBuffer[]>;
};

const estudioCumplido = (p: PedidoEstudio) => Boolean(p.Cumplido || Number(p.IdProtocolo) > 0);

function bloquesDeVisita(v: ExportVisitaData): Bloque[] {
	const pedido = new Set<ExportSectionKey>(v.criterios?.sections ?? []);
	const nv = v.numeroVisita;
	const out: Bloque[] = [];
	const agregar = (key: ExportSectionKey, b: Bloque) => {
		if (pedido.has(key)) out.push(b);
	};
	const base = (c: Contexto) => ({ empresaInfo: c.empresaInfo, patient: c.patient });

	const INTERNACION = 'Internación';
	agregar('admision', {
		grupo: INTERNACION,
		titulo: 'Datos de la internación',
		cantidad: v.admision ? 1 : 0,
		generar: (c) => generarPDFAdmision({ admision: v.admision ?? {}, ...base(c) }),
	});
	const movimientos = lista<Fila>(v.movimientos);
	agregar('movimientos', {
		grupo: INTERNACION,
		titulo: 'Movimientos / traslados',
		cantidad: movimientos.length,
		generar: (c) => generarPDFMovimientos({ items: movimientos, disposiciones: c.disposiciones, ...base(c) }),
	});

	const MEDICA = 'Gestión médica';
	const hc = lista<Fila>(v.historialClinico);
	agregar('hcIngreso', {
		grupo: MEDICA,
		titulo: 'HC de ingreso',
		cantidad: hc.length,
		generar: async (c) => {
			for (const r of hc) {
				await generarPDFHistoriaClinica(
					r,
					cleanPdfValue(c.patient.nombre),
					cleanPdfValue(c.patient.numeroDocumento),
					c.empresaInfo ?? undefined,
					cleanPdfValue(c.patient.ubicacion) || undefined,
				);
			}
		},
	});
	const indicaciones = lista<Fila>(v.indicaciones);
	const activas = indicaciones.filter((r) => !esIndicacionSuspendida(r));
	const sinEfecto = indicaciones.filter((r) => esIndicacionSuspendida(r));
	agregar('indicaciones', {
		grupo: MEDICA,
		titulo: 'Indicaciones médicas',
		cantidad: activas.length,
		generar: (c) =>
			generarPDFIndicaciones({ title: 'Indicaciones médicas', items: activas.map(indicacionParaPdf), ...base(c) }),
	});
	if (sinEfecto.length) {
		agregar('indicaciones', {
			grupo: MEDICA,
			titulo: 'Indicaciones sin efecto',
			cantidad: sinEfecto.length,
			generar: (c) =>
				generarPDFIndicaciones({ title: 'Indicaciones sin efecto', items: sinEfecto.map(indicacionParaPdf), ...base(c) }),
		});
	}
	const evoluciones = lista<Fila>(v.evolucionesMedicas);
	agregar('evoluciones', {
		grupo: MEDICA,
		titulo: 'Evoluciones',
		cantidad: evoluciones.length,
		generar: (c) => generarPDFEvoluciones({ title: 'Evoluciones', items: evoluciones.map(evolucionMedicaParaPdf), ...base(c) }),
	});
	const interconsultas = lista<InterconsultaRow>(v.interconsultas);
	agregar('interconsultas', {
		grupo: MEDICA,
		titulo: 'Interconsultas',
		cantidad: interconsultas.length,
		generar: (c) => generarPDFEstudios({ tipo: 'interconsulta', items: interconsultas.map(interconsultaParaPdf), ...base(c) }),
	});
	const estudios = lista<{ Items?: PedidoEstudio[] }>(v.estudios)
		.flatMap((s) => s.Items ?? [])
		.filter(estudioCumplido);
	agregar('estudios', {
		grupo: MEDICA,
		titulo: 'Estudios',
		cantidad: estudios.length,
		generar: (c) => generarPDFEstudios({ items: estudios, ...base(c) }),
	});
	const laboratorios = lista<ExamenLabCompleto>(v.practicas?.laboratorios);
	agregar('laboratorios', {
		grupo: MEDICA,
		titulo: 'Resultados de laboratorio',
		cantidad: laboratorios.length,
		generar: (c) => generarPDFLaboratorio({ items: laboratorios, ...base(c) }),
	});
	const protocolos = lista<ProtocoloClinico>(v.protocolos);
	agregar('protocolos', {
		grupo: MEDICA,
		titulo: 'Protocolos quirúrgicos',
		cantidad: protocolos.length,
		generar: (c) => generarPDFProtocolos({ protocolos, ...base(c) }),
	});
	const procedimientos = lista<FacPracticaVisita>(v.practicasPaciente);
	agregar('practicas', {
		grupo: MEDICA,
		titulo: 'Procedimientos',
		cantidad: procedimientos.length,
		generar: (c) => generarPDFProcedimientos({ items: procedimientos, ...base(c) }),
	});
	const epicrisis = lista<Fila>(v.epicrisis);
	agregar('epicrisis', {
		grupo: MEDICA,
		titulo: 'Epicrisis',
		cantidad: epicrisis.length,
		generar: (c) =>
			generarPDFEpicrisis(
				epicrisis.map(epicrisisParaPdf),
				{
					nombre: cleanPdfValue(c.patient.nombre),
					documento: cleanPdfValue(c.patient.numeroDocumento),
					numeroVisita: nv,
					ubicacion: cleanPdfValue(c.patient.ubicacion),
					fechaIngreso: cleanPdfValue(c.patient.fechaIngreso),
					horaIngreso: cleanPdfValue(c.patient.horaIngreso),
				},
				c.empresaInfo,
				`epicrisis_${nv}.pdf`,
			),
	});

	const ENFERMERIA = 'Gestión enfermería';
	const controles = lista<ControlFrecuente>(v.controles);
	agregar('controles', {
		grupo: ENFERMERIA,
		titulo: 'Controles frecuentes',
		cantidad: controles.length,
		generar: (c) => generarPDFControles({ items: controles, ...base(c) }),
	});
	const medicacion = lista<MedicacionControl>(v.medicamentos);
	agregar('medicamentos', {
		grupo: ENFERMERIA,
		titulo: 'Medicamentos suministrados',
		cantidad: medicacion.length,
		generar: (c) => generarPDFMedicacion({ items: medicacion, ...base(c) }),
	});
	const evolEnf = lista<Fila>(v.evolucionesEnfermeria);
	agregar('evolucionEnfermeria', {
		grupo: ENFERMERIA,
		titulo: 'Evolución de enfermería',
		cantidad: evolEnf.length,
		generar: (c) =>
			generarPDFEvoluciones({ title: 'Evolución de Enfermería', items: evolEnf.map(evolucionEnfermeriaParaPdf), ...base(c) }),
	});
	const balance = lista<BalanceHidrico>(v.balanceHidrico);
	agregar('balanceHidrico', {
		grupo: ENFERMERIA,
		titulo: 'Balance hídrico',
		cantidad: balance.length,
		generar: (c) => generarPDFBalanceHidrico({ items: balance, ...base(c) }),
	});
	const dietas = lista<DietaControl>(v.dietas);
	agregar('dietas', {
		grupo: ENFERMERIA,
		titulo: 'Dietas',
		cantidad: dietas.length,
		generar: (c) => generarPDFDieta({ items: dietas, ...base(c) }),
	});
	const insumos = lista<InsumoRow>(v.insumos);
	agregar('insumos', {
		grupo: ENFERMERIA,
		titulo: 'Insumos',
		cantidad: insumos.length,
		generar: (c) => generarPDFInsumos({ items: insumos, ...base(c) }),
	});

	const adjuntos = lista<AdjuntoPdf>(v.adjuntos);
	const bajar = async (a: AdjuntoPdf) => (await adjuntosService.cargarBlobAdjunto(a.IdAdjunto)).blob;
	agregar('adjuntos', {
		grupo: 'Documentación',
		titulo: 'Archivos adjuntos',
		cantidad: adjuntos.length,
		generar: (c) => generarPDFAdjuntos({ items: adjuntos, cargarArchivo: bajar, ...base(c) }),
		anexos: async () => {
			const out: ArrayBuffer[] = [];
			for (const a of adjuntos.filter(esPdfAdjunto)) {
				try {
					const bytes = await (await bajar(a)).arrayBuffer();
					await PDFDocument.load(bytes, { ignoreEncryption: true });
					out.push(bytes);
				} catch (err) {
					console.warn('[export] no se pudo anexar', a.NombreArchivo, err);
				}
			}
			return out;
		},
	});

	return out;
}

function pacienteDeVisita(v: ExportVisitaData): PDFHeaderPatient {
	const p = v.paciente ?? {};
	const t = (k: string) => cleanPdfValue(p[k] as string | number | null | undefined);
	return {
		nombre: t('ApellidoYNombre'),
		numeroDocumento: t('NumeroDocumento'),
		sexo: t('SexoDescripcion'),
		numeroVisita: v.numeroVisita,
		numeroHC: t('NumeroHC'),
		fechaIngreso: t('FechaAdmision'),
		horaIngreso: t('HoraAdmision'),
		ubicacion: [t('SectorDescripcion') || t('Sector'), t('Habitacion') && `Cama ${t('Habitacion')}`].filter(Boolean).join(' · '),
		cobertura: t('CoberturaOS'),
		afiliado: t('NumeroSSN'),
	};
}

type Parte = { bytes: ArrayBuffer; pie: PdfCapturado['pie'] };

type Renglon = {
	visita: ExportVisitaData;
	grupo: string;
	titulo: string;
	cantidad: number;
	partes: Parte[];
	error?: string;
	/** Página inicial (1 = primera hoja del índice); se completa al unir. */
	pagina?: number;
};

async function paginasDe(bytes: ArrayBuffer) {
	return (await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount();
}

function textoPeriodo(v: ExportVisitaData): string {
	const c = v.criterios;
	if (!c || c.exportAll || (!c.fechaInicio && !c.fechaFin)) return 'Toda la internación';
	if (c.fechaInicio && c.fechaFin) return `Del ${fechaCorta(c.fechaInicio)} al ${fechaCorta(c.fechaFin)}`;
	return c.fechaInicio ? `Desde el ${fechaCorta(c.fechaInicio)}` : `Hasta el ${fechaCorta(c.fechaFin)}`;
}

/** Índice: por visita y grupo, cada bloque con su cantidad y la hoja donde empieza. */
async function generarIndice(renglones: Renglon[], visitas: ExportVisitaData[], c: Contexto, carpeta: boolean) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const headerOpts: PDFHeaderOptions = {
		title: carpeta ? 'Carpeta del paciente' : 'Historia de la internación',
		empresaInfo: c.empresaInfo,
		patient: carpeta ? { ...c.patient, numeroVisita: null, fechaIngreso: null, horaIngreso: null, ubicacion: null } : c.patient,
		emittedAt: new Date(),
	};
	const x0 = PDF_MARGIN_X;
	const x1 = doc.internal.pageSize.getWidth() - PDF_MARGIN_X;
	const limite = doc.internal.pageSize.getHeight() - PDF_FOOTER_SPACE - 2;
	let y = await drawDocumentHeader(doc, headerOpts);
	const lugar = (alto: number) => {
		if (y + alto > limite) {
			doc.addPage();
			y = PDF_CONTENT_TOP;
		}
	};

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(11.5);
	doc.setTextColor(...PDF_COLORS.ink);
	doc.text('Contenido', x0, y);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(...PDF_COLORS.muted);
	const resumen = carpeta
		? `${visitas.length} ${visitas.length === 1 ? 'visita' : 'visitas'} · ${textoPeriodo(visitas[0])}`
		: textoPeriodo(visitas[0]);
	doc.text(resumen, x1, y, { align: 'right' });
	y += 6;

	for (const v of visitas) {
		const propios = renglones.filter((r) => r.visita === v);
		if (carpeta) {
			lugar(16);
			const p = v.paciente ?? {};
			const egreso = cleanPdfValue(p.FechaEgreso as string);
			y += 2;
			doc.setFillColor(...PDF_COLORS.brandSoft);
			doc.rect(x0, y, x1 - x0, 7, 'F');
			doc.setFillColor(...PDF_COLORS.brand);
			doc.rect(x0, y, 1, 7, 'F');
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(9);
			doc.setTextColor(...PDF_COLORS.ink);
			doc.text(`Visita ${v.numeroVisita}`, x0 + 3.5, y + 4.8);
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(7.8);
			doc.setTextColor(...PDF_COLORS.muted);
			const ingreso = fechaCorta(cleanPdfValue(p.FechaAdmision as string));
			doc.text(
				[ingreso && `Ingreso ${ingreso}`, egreso ? `Egreso ${fechaCorta(egreso)}` : 'Internado'].filter(Boolean).join('  ·  '),
				x1 - 2.5,
				y + 4.8,
				{ align: 'right' },
			);
			y += 9;
		}
		let grupo = '';
		for (const r of propios) {
			if (r.grupo !== grupo) {
				grupo = r.grupo;
				lugar(12);
				y += 2.5;
				doc.setFont('helvetica', 'bold');
				doc.setFontSize(7);
				doc.setTextColor(...PDF_COLORS.brand);
				doc.text(grupo.toUpperCase(), x0, y, { charSpace: 0.5 });
				y += 4.2;
			}
			lugar(6);
			const vacio = !r.partes.length;
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(9);
			doc.setTextColor(...PDF_COLORS[vacio ? 'muted' : 'ink']);
			doc.text(r.titulo, x0 + 3, y);
			const tituloFin = x0 + 3 + doc.getTextWidth(r.titulo) + 2;
			const detalle = r.error
				? 'No se pudo generar'
				: vacio
					? 'Sin registros en el período'
					: `${r.cantidad} ${r.cantidad === 1 ? 'registro' : 'registros'}`;
			doc.setFontSize(7.6);
			doc.setTextColor(...PDF_COLORS.muted);
			const detalleX = x1 - 14;
			doc.text(detalle, detalleX, y, { align: 'right' });
			if (!vacio) {
				const detalleIni = detalleX - doc.getTextWidth(detalle) - 2;
				doc.setDrawColor(...PDF_COLORS.line);
				doc.setLineDashPattern([0.4, 0.9], 0);
				doc.setLineWidth(0.25);
				if (detalleIni > tituloFin) doc.line(tituloFin, y - 0.6, detalleIni, y - 0.6);
				doc.setLineDashPattern([], 0);
				doc.setFont('helvetica', 'bold');
				doc.setFontSize(9);
				doc.setTextColor(...PDF_COLORS.ink);
				doc.text(String(r.pagina ?? ''), x1, y, { align: 'right' });
			}
			y += 5.4;
		}
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);
	entregarPDF(doc, 'indice.pdf');
}

export type ProgresoExport = (texto: string) => void;

/**
 * Arma y descarga el PDF de una visita o de la carpeta (varias visitas, de la más
 * reciente a la más antigua). `visitas` es la respuesta del export del back.
 */
export async function exportarHistoriaPdf(
	visitas: ExportVisitaData[],
	opts: { fileName: string; carpeta?: boolean; onProgress?: ProgresoExport },
) {
	if (!visitas.length) throw new Error('No hay datos para exportar');
	const carpeta = Boolean(opts.carpeta);
	const avisar = opts.onProgress ?? (() => undefined);

	const necesitaDisposiciones = visitas.some((v) => v.criterios?.sections?.includes('movimientos'));
	const [empresaInfo, disposiciones] = await Promise.all([
		obtenerInfoEmpresa().catch(() => null),
		necesitaDisposiciones
			? getDisposicionesEgreso()
					.then(catalogoDisposiciones)
					.catch(() => catalogoDisposiciones([]))
			: Promise.resolve(new Map<number, string>()),
	]);

	const renglones: Renglon[] = [];
	for (let i = 0; i < visitas.length; i++) {
		const v = visitas[i];
		const ctx: Contexto = { empresaInfo, patient: pacienteDeVisita(v), disposiciones };
		for (const b of bloquesDeVisita(v)) {
			const renglon: Renglon = { visita: v, grupo: b.grupo, titulo: b.titulo, cantidad: b.cantidad, partes: [] };
			renglones.push(renglon);
			if (!b.cantidad) continue;
			avisar(carpeta ? `Visita ${v.numeroVisita} (${i + 1}/${visitas.length}) · ${b.titulo}` : b.titulo);
			try {
				renglon.partes = await capturarPDFs(() => b.generar(ctx));
				if (b.anexos) {
					const anexos = await b.anexos();
					renglon.partes.push(...anexos.map((bytes) => ({ bytes, pie: null })));
				}
			} catch (err) {
				console.error(`[export] ${b.titulo}:`, err);
				renglon.error = err instanceof Error ? err.message : String(err);
				renglon.partes = [];
			}
		}
	}

	avisar('Uniendo el documento');
	const ctxIndice: Contexto = { empresaInfo, patient: pacienteDeVisita(visitas[0]), disposiciones };
	const paginas = await Promise.all(renglones.map(async (r) => {
		let n = 0;
		for (const p of r.partes) n += await paginasDe(p.bytes);
		return n;
	}));
	// El índice se arma dos veces: la primera solo para saber cuántas hojas ocupa.
	let indice: PdfCapturado[] = [];
	let hojasIndice = 1;
	for (let intento = 0; intento < 3; intento++) {
		let pagina = hojasIndice + 1;
		renglones.forEach((r, i) => {
			r.pagina = paginas[i] ? pagina : undefined;
			pagina += paginas[i];
		});
		indice = await capturarPDFs(() => generarIndice(renglones, visitas, ctxIndice, carpeta));
		const hojas = await paginasDe(indice[0].bytes);
		if (hojas === hojasIndice) break;
		hojasIndice = hojas;
	}

	const final = await PDFDocument.create();
	const numerar: Array<{ indice: number; pie: NonNullable<Parte['pie']> }> = [];
	for (const parte of indice.concat(...renglones.map((r) => r.partes))) {
		const src = await PDFDocument.load(parte.bytes, { ignoreEncryption: true });
		const copiadas = await final.copyPages(src, src.getPageIndices());
		for (const pag of copiadas) {
			final.addPage(pag);
			if (parte.pie) numerar.push({ indice: final.getPageCount() - 1, pie: parte.pie });
		}
	}

	const MM = 72 / 25.4;
	const fuente = await final.embedFont(StandardFonts.HelveticaBold);
	const [r, g, b] = PDF_COLORS.text;
	const total = final.getPageCount();
	for (const { indice: i, pie } of numerar) {
		const page = final.getPage(i);
		const texto = `Página ${i + 1} de ${total}`;
		const ancho = fuente.widthOfTextAtSize(texto, 7);
		page.drawText(texto, {
			x: pie.x1 * MM - ancho,
			y: page.getHeight() - pie.y * MM,
			size: 7,
			font: fuente,
			color: rgb(r / 255, g / 255, b / 255),
		});
	}

	const bytes = await final.save();
	const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
	const a = document.createElement('a');
	a.href = url;
	a.download = opts.fileName;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10000);
}
