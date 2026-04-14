import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EmpresaInfo } from '@/app/services/empresaService';
import { HCI_CAMPOS_TEXTO_LIBRE, buildHCIPhysicalExamSections } from './hciIngresoDisplay';

type HCIngresoData = Record<string, any>;

export const generarPDFHistoriaClinica = (
    data: HCIngresoData,
    pacienteNombre: string,
    pacienteDNI: string,
    empresaInfo?: EmpresaInfo
) => {
    const doc = new jsPDF();
    let yPosition = 10;
    
    // Colores del sistema (como tuplas)
    const colorPrimario: [number, number, number] = [0, 131, 169]; // #0083A9
    const colorSecundario: [number, number, number] = [0, 181, 226]; // #00B5E2
    const colorTexto: [number, number, number] = [51, 65, 85]; // #334155
    const colorGris: [number, number, number] = [100, 116, 139]; // #64748b
    
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // ===== HEADER ESTÁNDAR DEL SISTEMA =====
    // Borde superior del header
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(10, yPosition, pageWidth - 20, 35);
    
    // Logo placeholder (izquierda) - 30x30mm
    doc.setFillColor(240, 240, 240);
    doc.rect(12, yPosition + 2, 30, 30, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('LOGO', 27, yPosition + 18, { align: 'center' });
    
    // Información de la empresa (centro-derecha)
    const empresaX = 45;
    const empresaStartY = yPosition + 5;
    
    // Título del documento en negro sobre fondo
    doc.setFillColor(0, 0, 0);
    doc.rect(empresaX, empresaStartY - 3, pageWidth - empresaX - 12, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('HISTORIA CLÍNICA DE INGRESO', empresaX + 2, empresaStartY + 1);
    
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
    doc.text(empresaInfo?.ingresosBrutos || '0', col2X + 22, infoY);
    
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
    
    yPosition += 38;
    
    // ===== INFORMACIÓN DEL PACIENTE =====
    doc.setFillColor(248, 250, 252); // #f8fafc
    doc.rect(10, yPosition, 190, 8, 'F');
    doc.setTextColor(...colorPrimario);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Paciente: ${pacienteNombre} - DNI: ${pacienteDNI}`, 15, yPosition + 5.5);
    yPosition += 12;
    
    // ===== DATOS BÁSICOS =====
    const datosBasicos = [
        ['N. Visita:', String(data.NumeroVisita || '-')],
        ['Fecha:', data.FechaFormateada || '-'],
        ['Hora:', data.HoraFormateada || '-'],
        ['Profesional:', data.ProfesionalNombre || String(data.IdProfecional || '-')],
        ['Sector:', data.SectorDescripcion || data.IdSector || '-'],
    ];
    
    autoTable(doc, {
        startY: yPosition,
        head: [],
        body: datosBasicos,
        theme: 'plain',
        styles: {
            fontSize: 9,
            cellPadding: 2,
            textColor: colorTexto,
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 30, textColor: colorPrimario },
            1: { cellWidth: 160 }
        },
        margin: { left: 15, right: 15 },
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 5;
    
    // ===== MOTIVO DE CONSULTA =====
    if (data.MotivoConsulta) {
        // Título de sección
        doc.setFillColor(...colorSecundario);
        doc.rect(10, yPosition, 190, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('MOTIVO DE CONSULTA', 15, yPosition + 5);
        yPosition += 10;
        
        // Contenido con espaciado mejorado
        doc.setTextColor(...colorTexto);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const motivoLines = doc.splitTextToSize(data.MotivoConsulta, 180);
        const lineHeight = 4.5; // Espaciado entre líneas
        motivoLines.forEach((line: string, index: number) => {
            doc.text(line, 15, yPosition + (index * lineHeight));
        });
        yPosition += motivoLines.length * lineHeight + 5;
    }
    
    // ===== ENFERMEDAD ACTUAL =====
    if (data.EnfermedadActual) {
        // Verificar si necesitamos nueva página
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 15;
        }
        
        // Título de sección
        doc.setFillColor(...colorSecundario);
        doc.rect(10, yPosition, 190, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('ENFERMEDAD ACTUAL', 15, yPosition + 5);
        yPosition += 10;
        
        // Contenido con espaciado mejorado
        doc.setTextColor(...colorTexto);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const enfermedadLines = doc.splitTextToSize(data.EnfermedadActual, 180);
        const lineHeight = 4.5; // Espaciado entre líneas
        enfermedadLines.forEach((line: string, index: number) => {
            doc.text(line, 15, yPosition + (index * lineHeight));
        });
        yPosition += enfermedadLines.length * lineHeight + 5;
    }

    // ===== TEXTOS CLÍNICOS ADICIONALES (columnas planas en imHCI) =====
    Object.entries(HCI_CAMPOS_TEXTO_LIBRE).forEach(([campo, tituloPdf]) => {
        const raw = data[campo];
        const texto = raw != null && raw !== '' ? String(raw).trim() : '';
        if (!texto) {
            return;
        }

        if (yPosition > 250) {
            doc.addPage();
            yPosition = 15;
        }

        doc.setFillColor(...colorSecundario);
        doc.rect(10, yPosition, 190, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(tituloPdf, 15, yPosition + 5);
        yPosition += 10;

        doc.setTextColor(...colorTexto);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const extraLines = doc.splitTextToSize(texto, 180);
        const lineHeightExtra = 4.5;
        extraLines.forEach((line: string, index: number) => {
            doc.text(line, 15, yPosition + index * lineHeightExtra);
        });
        yPosition += extraLines.length * lineHeightExtra + 5;
    });
    
    // ===== SECCIONES DE EXAMEN FÍSICO =====
    const secciones = buildHCIPhysicalExamSections(data);
    secciones.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));

    secciones.forEach(seccion => {
        // Verificar si necesitamos nueva página
        if (yPosition > 240) {
            doc.addPage();
            yPosition = 15;
        }
        
        // Título de sección
        doc.setFillColor(...colorSecundario);
        doc.rect(10, yPosition, 190, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(seccion.titulo, 15, yPosition + 5);
        yPosition += 10;
        
        // Tabla de campos
        const camposData = seccion.campos.map(campo => [campo.label, campo.valor]);
        
        autoTable(doc, {
            startY: yPosition,
            head: [],
            body: camposData,
            theme: 'striped',
            styles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: colorTexto,
            },
            headStyles: {
                fillColor: colorPrimario,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252], // #f8fafc
            },
            columnStyles: {
                0: { 
                    fontStyle: 'bold', 
                    cellWidth: 60,
                    textColor: colorPrimario,
                    fontSize: 8,
                },
                1: { 
                    cellWidth: 125,
                    fontSize: 8,
                }
            },
            margin: { left: 15, right: 15 },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 5;
    });
    
    // ===== PIE DE PÁGINA =====
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...colorGris);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `Página ${i} de ${totalPages}`,
            105,
            287,
            { align: 'center' }
        );
        doc.text(
            `Generado: ${new Date().toLocaleString('es-AR')}`,
            105,
            292,
            { align: 'center' }
        );
    }
    
    // Guardar PDF
    const nombreArchivo = `HC_Ingreso_${data.NumeroVisita}_${new Date().getTime()}.pdf`;
    doc.save(nombreArchivo);
};
