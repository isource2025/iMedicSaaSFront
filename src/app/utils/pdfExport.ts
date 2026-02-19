import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EmpresaInfo } from '../services/empresaService';

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  data: any[][];
  fileName?: string;
  orientation?: 'portrait' | 'landscape';
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

export const exportToPDF = ({
  title,
  subtitle,
  headers,
  data,
  fileName = 'export.pdf',
  orientation = 'portrait',
  empresaInfo,
  patientInfo,
  profesionalInfo
}: PDFExportOptions) => {
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 10;

  // ========== HEADER DE EMPRESA (SIEMPRE EL MISMO) ==========
  // Borde superior del header
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(10, currentY, pageWidth - 20, 35);

  // Logo placeholder (izquierda) - 30x30mm
  doc.setFillColor(240, 240, 240);
  doc.rect(12, currentY + 2, 30, 30, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('LOGO', 27, currentY + 18, { align: 'center' });

  // Información de la empresa (centro-derecha)
  const empresaX = 45;
  const empresaStartY = currentY + 5;

  // Título del documento en negro sobre fondo
  doc.setFillColor(0, 0, 0);
  doc.rect(empresaX, empresaStartY - 3, pageWidth - empresaX - 12, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), empresaX + 2, empresaStartY + 1);

  // Datos de la empresa en dos columnas
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const col1X = empresaX + 2;
  const col2X = pageWidth - 70;
  let infoY = empresaStartY + 8;

  // Construir dirección completa
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

  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('FAX:', col2X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(empresaInfo?.fax || '-', col2X + 15, infoY);

  currentY += 37;

  // ========== INFORMACIÓN DEL PACIENTE ==========
  if (patientInfo) {
    currentY += 3;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    let patInfoY = currentY;
    const leftCol = 12;

    // Primera línea
    doc.text(`Nro Visita: `, leftCol, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patientInfo.numeroVisita || '-'}`, leftCol + 20, patInfoY);

    doc.setFont('helvetica', 'bold');
    doc.text(`Fecha: `, leftCol + 50, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patientInfo.fechaIngreso || '-'}`, leftCol + 62, patInfoY);

    doc.setFont('helvetica', 'bold');
    doc.text(`Hora: `, leftCol + 95, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patientInfo.horaIngreso || '-'}`, leftCol + 105, patInfoY);

    doc.setFont('helvetica', 'bold');
    doc.text(`Nro Documento: `, leftCol + 130, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patientInfo.numeroDocumento || '-'}`, leftCol + 158, patInfoY);

    // Segunda línea
    patInfoY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Apellido y Nombre: `, leftCol, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patientInfo.nombre || '-'}`, leftCol + 35, patInfoY);

    // Tercera línea - Ubicación en línea separada para evitar solapamiento
    patInfoY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Ubicación: `, leftCol, patInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patientInfo.ubicacion || '-'}`, leftCol + 20, patInfoY);

    currentY += 17;
  }

  // ========== SUBTÍTULO (si existe) ==========
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60, 60, 60);
    doc.text(subtitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
  }

  // ========== TABLA DE DATOS ==========
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: currentY,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
      font: 'helvetica',
      cellWidth: 'wrap'
    },
    headStyles: {
      fillColor: [0, 181, 226],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9
    },
    columnStyles: {
      // La columna de evolución/observaciones debe tener más espacio
      3: { cellWidth: 'auto', minCellWidth: 60 }
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    margin: { top: 10, right: 10, bottom: 30, left: 10 }
  });

  // ========== FIRMA DIGITAL DEL MÉDICO ==========
  if (profesionalInfo && profesionalInfo.nombre) {
    const finalY = (doc as any).lastAutoTable.finalY || currentY + 50;
    const firmaY = Math.min(finalY + 20, pageHeight - 40);

    // Línea para firma
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    const firmaX = pageWidth / 2 - 30;
    doc.line(firmaX, firmaY, firmaX + 60, firmaY);

    // Firma digital placeholder (si existe)
    if (profesionalInfo.firmaDigital) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Firma Digital', pageWidth / 2, firmaY - 5, { align: 'center' });
    }

    // Información del profesional
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(profesionalInfo.nombre.toUpperCase(), pageWidth / 2, firmaY + 5, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    let offsetY = 9;
    if (profesionalInfo.matricula) {
      doc.text(`Mat. ${profesionalInfo.matricula}`, pageWidth / 2, firmaY + offsetY, { align: 'center' });
      offsetY += 4;
    }
    if (profesionalInfo.especialidad) {
      doc.text(profesionalInfo.especialidad.toUpperCase(), pageWidth / 2, firmaY + offsetY, { align: 'center' });
    }
  }

  // ========== FOOTER ==========
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR');
  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Date: ${dateStr}`, 12, pageHeight - 5);
  doc.text(`Time: ${timeStr}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
  doc.text(`Page: 1`, pageWidth - 12, pageHeight - 5, { align: 'right' });

  doc.save(fileName);
};
