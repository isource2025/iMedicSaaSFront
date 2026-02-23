import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EmpresaInfo } from '../services/empresaService';
import { HCIngresoRecord } from '../types/hcIngreso';

export interface PDFHCIOptions {
  hcData: HCIngresoRecord;
  empresaInfo?: EmpresaInfo;
  patientInfo?: {
    numeroVisita?: string | number;
    nombre?: string;
    documento?: string;
    numeroDocumento?: string;
    ubicacion?: string;
    fechaIngreso?: string;
    horaIngreso?: string;
  };
  profesionalInfo?: {
    nombre?: string;
    matricula?: string;
    especialidad?: string;
    firmaDigital?: string;
  };
}

export const exportHCIToPDF = ({
  hcData,
  empresaInfo,
  patientInfo,
  profesionalInfo
}: PDFHCIOptions) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 10;

  // ========== HEADER DE EMPRESA ==========
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(10, currentY, pageWidth - 20, 35);

  // Logo placeholder
  doc.setFillColor(240, 240, 240);
  doc.rect(12, currentY + 2, 30, 30, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('LOGO', 27, currentY + 18, { align: 'center' });

  // Información de la empresa
  const empresaX = 45;
  const empresaStartY = currentY + 5;

  // Título del documento
  doc.setFillColor(0, 0, 0);
  doc.rect(empresaX, empresaStartY - 3, pageWidth - empresaX - 12, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('HISTORIA CLÍNICA DE INGRESO', empresaX + 2, empresaStartY + 1);

  // Datos de la empresa
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const col1X = empresaX + 2;
  const col2X = pageWidth - 70;
  let infoY = empresaStartY + 8;

  const direccionCompleta = [
    empresaInfo?.calle,
    empresaInfo?.calle_nro,
    empresaInfo?.Depto,
    empresaInfo?.piso
  ].filter(Boolean).join(' ') || '-';

  // Columna 1
  doc.setFont('helvetica', 'bold');
  doc.text('RAZÓN SOCIAL:', col1X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(empresaInfo?.razonSocial || empresaInfo?.descripcion || 'HOSPITAL', col1X + 28, infoY);

  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('DIRECCIÓN:', col1X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(direccionCompleta, col1X + 28, infoY);

  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('LOCALIDAD:', col1X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(empresaInfo?.localidad || '-', col1X + 28, infoY);

  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('TELÉFONO:', col1X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(empresaInfo?.telefono || '-', col1X + 28, infoY);

  // Columna 2
  infoY = empresaStartY + 8;
  doc.setFont('helvetica', 'bold');
  doc.text('C.U.I.T.:', col2X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(empresaInfo?.cuit || '-', col2X + 15, infoY);

  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('CONDICIÓN:', col2X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(empresaInfo?.condicionIva || '-', col2X + 22, infoY);

  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('ING. BRUTOS:', col2X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(empresaInfo?.ingresosBrutos || '-', col2X + 22, infoY);

  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('PROVINCIA:', col2X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(empresaInfo?.provincia || '-', col2X + 22, infoY);

  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('EMAIL:', col2X, infoY);
  doc.setFont('helvetica', 'normal');
  const emailText = empresaInfo?.email || '-';
  doc.text(emailText.length > 25 ? emailText.substring(0, 25) + '...' : emailText, col2X + 15, infoY);

  currentY += 37;

  // ========== INFORMACIÓN DEL PACIENTE ==========
  if (patientInfo) {
    currentY += 3;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    let patInfoY = currentY;
    const leftCol = 12;

    doc.text(`Nro Visita: `, leftCol, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patientInfo.numeroVisita || hcData.NumeroVisita || '-'}`, leftCol + 20, patInfoY);

    doc.setFont('helvetica', 'bold');
    doc.text(`Fecha: `, leftCol + 50, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${hcData.FechaFormateada || patientInfo.fechaIngreso || '-'}`, leftCol + 62, patInfoY);

    doc.setFont('helvetica', 'bold');
    doc.text(`Hora: `, leftCol + 95, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${hcData.HoraFormateada || patientInfo.horaIngreso || '-'}`, leftCol + 105, patInfoY);

    doc.setFont('helvetica', 'bold');
    doc.text(`Nro Documento: `, leftCol + 130, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patientInfo.numeroDocumento || '-'}`, leftCol + 158, patInfoY);

    patInfoY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Apellido y Nombre: `, leftCol, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patientInfo.nombre || '-'}`, leftCol + 35, patInfoY);

    patInfoY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Ubicación: `, leftCol, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patientInfo.ubicacion || '-'}`, leftCol + 20, patInfoY);

    patInfoY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Profesional: `, leftCol, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${hcData.ProfesionalNombre || profesionalInfo?.nombre || '-'}`, leftCol + 25, patInfoY);

    doc.setFont('helvetica', 'bold');
    doc.text(`Sector: `, leftCol + 100, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${hcData.SectorDescripcion || hcData.IdSector || '-'}`, leftCol + 115, patInfoY);

    currentY += 22;
  }

  // ========== CONTENIDO DE LA HISTORIA CLÍNICA ==========
  currentY += 5;

  // Sección: Motivo de Consulta
  if (hcData.MotivoConsulta) {
    doc.setFillColor(0, 181, 226);
    doc.rect(10, currentY, pageWidth - 20, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('MOTIVO DE CONSULTA', 12, currentY + 5);
    currentY += 9;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const motivoLines = doc.splitTextToSize(hcData.MotivoConsulta, pageWidth - 24);
    doc.text(motivoLines, 12, currentY);
    currentY += motivoLines.length * 5 + 5;
  }

  // Sección: Enfermedad Actual
  if (hcData.EnfermedadActual) {
    // Verificar si necesitamos nueva página
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 15;
    }

    doc.setFillColor(0, 181, 226);
    doc.rect(10, currentY, pageWidth - 20, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ENFERMEDAD ACTUAL', 12, currentY + 5);
    currentY += 9;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const enfermedadLines = doc.splitTextToSize(hcData.EnfermedadActual, pageWidth - 24);
    doc.text(enfermedadLines, 12, currentY);
    currentY += enfermedadLines.length * 5 + 5;
  }

  // Aquí se pueden agregar más secciones del examen físico cuando estén disponibles
  // Por ahora mostramos la información básica disponible

  // ========== FIRMA DIGITAL DEL MÉDICO ==========
  if (profesionalInfo && profesionalInfo.nombre) {
    const firmaY = Math.min(currentY + 20, pageHeight - 40);

    // Si no hay espacio, nueva página
    if (firmaY > pageHeight - 50) {
      doc.addPage();
      currentY = 15;
    } else {
      currentY = firmaY;
    }

    // Línea para firma
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    const firmaX = pageWidth / 2 - 30;
    doc.line(firmaX, currentY, firmaX + 60, currentY);

    // Firma digital placeholder
    if (profesionalInfo.firmaDigital) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Firma Digital', pageWidth / 2, currentY - 5, { align: 'center' });
    }

    // Información del profesional
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(profesionalInfo.nombre.toUpperCase(), pageWidth / 2, currentY + 5, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    let offsetY = 9;
    if (profesionalInfo.matricula) {
      doc.text(`Mat. ${profesionalInfo.matricula}`, pageWidth / 2, currentY + offsetY, { align: 'center' });
      offsetY += 4;
    }
    if (profesionalInfo.especialidad) {
      doc.text(profesionalInfo.especialidad.toUpperCase(), pageWidth / 2, currentY + offsetY, { align: 'center' });
    }
  }

  // ========== FOOTER ==========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-AR');
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Date: ${dateStr}`, 12, pageHeight - 5);
    doc.text(`Time: ${timeStr}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    doc.text(`Page: ${i} of ${totalPages}`, pageWidth - 12, pageHeight - 5, { align: 'right' });
  }

  // Generar nombre de archivo
  const fileName = `HC_Ingreso_${hcData.NumeroVisita}_${hcData.FechaFormateada || 'sin_fecha'}.pdf`;
  doc.save(fileName);
};
