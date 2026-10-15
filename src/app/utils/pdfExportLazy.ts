/**
 * Wrappers lazy de los exportadores PDF.
 *
 * jsPDF y los módulos de cada PDF pesan varios cientos de KB; las secciones de la
 * ficha de cama los importan por acá para que el chunk recién se baje al primer
 * click en "Exportar PDF".
 *
 * Misma firma que las funciones originales (todas async).
 */

type GenerarPDFEpicrisis = typeof import('./pdfEpicrisis').generarPDFEpicrisis;
export const generarPDFEpicrisis: GenerarPDFEpicrisis = async (...args) =>
	(await import('./pdfEpicrisis')).generarPDFEpicrisis(...args);

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

type GenerarPDFMedicacion = typeof import('./pdfMedicacion').generarPDFMedicacion;
export const generarPDFMedicacion: GenerarPDFMedicacion = async (...args) =>
	(await import('./pdfMedicacion')).generarPDFMedicacion(...args);

type GenerarPDFControles = typeof import('./pdfControles').generarPDFControles;
export const generarPDFControles: GenerarPDFControles = async (...args) =>
	(await import('./pdfControles')).generarPDFControles(...args);

type GenerarPDFDieta = typeof import('./pdfDieta').generarPDFDieta;
export const generarPDFDieta: GenerarPDFDieta = async (...args) =>
	(await import('./pdfDieta')).generarPDFDieta(...args);

type GenerarPDFBalanceHidrico = typeof import('./pdfBalanceHidrico').generarPDFBalanceHidrico;
export const generarPDFBalanceHidrico: GenerarPDFBalanceHidrico = async (...args) =>
	(await import('./pdfBalanceHidrico')).generarPDFBalanceHidrico(...args);

type GenerarPDFInsumos = typeof import('./pdfInsumos').generarPDFInsumos;
export const generarPDFInsumos: GenerarPDFInsumos = async (...args) =>
	(await import('./pdfInsumos')).generarPDFInsumos(...args);

type GenerarPDFLaboratorio = typeof import('./pdfLaboratorio').generarPDFLaboratorio;
export const generarPDFLaboratorio: GenerarPDFLaboratorio = async (...args) =>
	(await import('./pdfLaboratorio')).generarPDFLaboratorio(...args);

type GenerarPDFMovimientos = typeof import('./pdfMovimientos').generarPDFMovimientos;
export const generarPDFMovimientos: GenerarPDFMovimientos = async (...args) =>
	(await import('./pdfMovimientos')).generarPDFMovimientos(...args);

type GenerarPDFAdjuntos = typeof import('./pdfAdjuntos').generarPDFAdjuntos;
export const generarPDFAdjuntos: GenerarPDFAdjuntos = async (...args) =>
	(await import('./pdfAdjuntos')).generarPDFAdjuntos(...args);
