import type { EmpresaInfo } from "@/app/services/empresaService";
import type { PdfDiseno } from "@/app/utils/pdfDiseno";

const ANCHO_PX = 1600;

export type PreviewRecortes = { header: string; footer: string };

const PACIENTE_EJEMPLO = {
  nombre: "Paciente de ejemplo",
  numeroDocumento: "30123456",
  sexo: "Femenino",
  fechaNacimiento: "1985-03-12",
  numeroVisita: 123456,
  fechaIngreso: new Date().toISOString().slice(0, 10),
  horaIngreso: "09:30",
  ubicacion: "Clínica médica · Cama 12",
  cobertura: "Obra social",
  afiliado: "0500011501341289",
  numeroHC: "128734",
};

/** Contenido de muestra para ver cómo el diseño afecta el cuerpo (color de marca y tipografía). */
async function contenidoEjemplo(doc: import("jspdf").jsPDF, y: number) {
  const { PDF_COLORS, PDF_MARGIN_X } = await import("@/app/utils/pdfHeader");
  const x0 = PDF_MARGIN_X;
  const x1 = doc.internal.pageSize.getWidth() - PDF_MARGIN_X;
  const capitulo = (t: string) => {
    doc.setFillColor(...PDF_COLORS.brand);
    doc.rect(x0, y - 3.8, 1.1, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...PDF_COLORS.ink);
    doc.text(t, x0 + 3.5, y);
    y += 7;
  };
  const subtitulo = (t: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.brand);
    doc.text(t.toUpperCase(), x0, y, { charSpace: 0.4 });
    const w = doc.getTextWidth(t.toUpperCase()) + 0.4 * (t.length - 1);
    doc.setDrawColor(...PDF_COLORS.line);
    doc.setLineWidth(0.2);
    doc.line(x0 + w + 2.5, y - 1, x1, y - 1);
    y += 5;
  };
  const parrafo = (t: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...PDF_COLORS.ink);
    const lines = doc.splitTextToSize(t, x1 - x0) as string[];
    doc.text(lines, x0, y, { lineHeightFactor: 1.35 });
    y += lines.length * 4.6 + 4;
  };
  capitulo("Anamnesis");
  subtitulo("Motivo de consulta");
  parrafo("Fiebre de dos días de evolución.");
  subtitulo("Enfermedad actual");
  parrafo(
    "Paciente de 41 años que consulta por fiebre de 38,5 °C, tos seca y astenia de dos días de evolución. Niega disnea. Refiere contacto con familiar con cuadro similar.",
  );
  capitulo("Evaluación y plan");
  subtitulo("Impresión diagnóstica");
  parrafo("Síndrome febril en estudio. Probable infección respiratoria alta.");
}

async function construir(empresa: EmpresaInfo, logo: string | null, diseno: PdfDiseno, conContenido: boolean) {
  const [{ jsPDF }, header] = await Promise.all([import("jspdf"), import("@/app/utils/pdfHeader")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const opts = {
    title: "Historia Clínica de Ingreso",
    empresaInfo: { ...empresa, logo: logo ?? undefined },
    patient: PACIENTE_EJEMPLO,
    diseno,
  };
  const finHeaderMm = await header.drawDocumentHeader(doc, opts);
  if (conContenido) await contenidoEjemplo(doc, finHeaderMm);
  header.drawDocumentFooters(doc, opts);
  return { doc, finHeaderMm, altoMm: doc.internal.pageSize.getHeight() };
}

async function renderizarPagina(doc: import("jspdf").jsPDF): Promise<HTMLCanvasElement> {
  const { loadPdfFromBlob } = await import("@/app/utils/pdfJs");
  const pdf = await loadPdfFromBlob(doc.output("blob"));
  try {
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: ANCHO_PX / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no disponible");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas;
  } finally {
    await pdf.destroy();
  }
}

/** Encabezado y pie recortados de la primera página (pestaña de datos). */
export async function previewRecortes(
  empresa: EmpresaInfo,
  logo: string | null,
  diseno: PdfDiseno,
): Promise<PreviewRecortes> {
  const { doc, finHeaderMm, altoMm } = await construir(empresa, logo, diseno, false);
  const canvas = await renderizarPagina(doc);
  const pxPorMm = canvas.height / altoMm;
  const recortar = (desdeMm: number, hastaMm: number) => {
    const y = Math.max(0, Math.floor(desdeMm * pxPorMm));
    const h = Math.min(canvas.height - y, Math.ceil((hastaMm - desdeMm) * pxPorMm));
    const c = document.createElement("canvas");
    c.width = canvas.width;
    c.height = h;
    c.getContext("2d")?.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    return c.toDataURL("image/png");
  };
  return { header: recortar(0, finHeaderMm + 4), footer: recortar(altoMm - 16, altoMm) };
}

/** Página completa con contenido de muestra (editor de diseño). */
export async function previewPagina(empresa: EmpresaInfo, logo: string | null, diseno: PdfDiseno): Promise<string> {
  const { doc } = await construir(empresa, logo, diseno, true);
  return (await renderizarPagina(doc)).toDataURL("image/png");
}
