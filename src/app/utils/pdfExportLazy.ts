/**
 * Wrappers lazy de los exportadores PDF.
 *
 * `pdfExport.ts` arrastra jsPDF + autotable (~400 KB) y las secciones de la
 * ficha de cama lo importaban estáticamente, así que el bundle de /beds/[id]
 * lo descargaba y parseaba aunque nadie exportara nada. Con `import()` el
 * chunk recién se baja al primer click en "Exportar PDF".
 *
 * Misma firma que las funciones originales (ambas ya eran async).
 */
import type { PDFExportOptions } from './pdfExport';

type GenerarPDFEpicrisis = typeof import('./pdfEpicrisis').generarPDFEpicrisis;

let pdfExportMod: Promise<typeof import('./pdfExport')> | null = null;
let pdfEpicrisisMod: Promise<typeof import('./pdfEpicrisis')> | null = null;

function cargarPdfExport() {
	if (!pdfExportMod) {
		pdfExportMod = import('./pdfExport').catch((e) => {
			pdfExportMod = null; // permitir reintento si falló la descarga del chunk
			throw e;
		});
	}
	return pdfExportMod;
}

function cargarPdfEpicrisis() {
	if (!pdfEpicrisisMod) {
		pdfEpicrisisMod = import('./pdfEpicrisis').catch((e) => {
			pdfEpicrisisMod = null;
			throw e;
		});
	}
	return pdfEpicrisisMod;
}

export const exportToPDF = async (opts: PDFExportOptions) => (await cargarPdfExport()).exportToPDF(opts);

export const generarPDFEpicrisis: GenerarPDFEpicrisis = async (...args) =>
	(await cargarPdfEpicrisis()).generarPDFEpicrisis(...args);

type GenerarPDFHistoriaClinica = typeof import('./pdfHCIngreso').generarPDFHistoriaClinica;
export const generarPDFHistoriaClinica: GenerarPDFHistoriaClinica = async (...args) =>
	(await import('./pdfHCIngreso')).generarPDFHistoriaClinica(...args);

type GenerarPDFEvoluciones = typeof import('./pdfEvoluciones').generarPDFEvoluciones;
export const generarPDFEvoluciones: GenerarPDFEvoluciones = async (...args) =>
	(await import('./pdfEvoluciones')).generarPDFEvoluciones(...args);

type GenerarPDFIndicaciones = typeof import('./pdfIndicaciones').generarPDFIndicaciones;
export const generarPDFIndicaciones: GenerarPDFIndicaciones = async (...args) =>
	(await import('./pdfIndicaciones')).generarPDFIndicaciones(...args);

type GenerarPDFProtocolos = typeof import('./pdfProtocolos').generarPDFProtocolos;
export const generarPDFProtocolos: GenerarPDFProtocolos = async (...args) =>
	(await import('./pdfProtocolos')).generarPDFProtocolos(...args);

type GenerarPDFProcedimientos = typeof import('./pdfProcedimientos').generarPDFProcedimientos;
export const generarPDFProcedimientos: GenerarPDFProcedimientos = async (...args) =>
	(await import('./pdfProcedimientos')).generarPDFProcedimientos(...args);

type GenerarPDFEstudios = typeof import('./pdfEstudios').generarPDFEstudios;
export const generarPDFEstudios: GenerarPDFEstudios = async (...args) =>
	(await import('./pdfEstudios')).generarPDFEstudios(...args);

/** Precarga opcional (p. ej. al hacer hover sobre el botón de exportar). */
export const precargarPdfExport = () => {
	void cargarPdfExport();
};

export type { PDFExportOptions };
