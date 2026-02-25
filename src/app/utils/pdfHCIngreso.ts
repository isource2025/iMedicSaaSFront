import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EmpresaInfo } from '@/app/services/empresaService';

interface HCIngresoData {
    NumeroVisita: number;
    FechaFormateada?: string;
    HoraFormateada?: string;
    ProfesionalNombre?: string;
    IdProfecional?: number;
    SectorDescripcion?: string;
    IdSector?: string;
    MotivoConsulta?: string;
    EnfermedadActual?: string;
    [key: string]: any;
}

interface SeccionPDF {
    titulo: string;
    campos: Array<{ label: string; valor: string }>;
}

// Configuración de secciones
const SECCIONES_CONFIG: Record<string, string> = {
    'SV': 'SIGNOS VITALES',
    'PF': 'PIEL Y FANERAS',
    'TCS': 'TEJIDO CELULAR SUBCUTÁNEO',
    'SL': 'SISTEMA LINFÁTICO',
    'SOAM': 'SISTEMA OSTEOARTICULOMUSCULAR',
    'C': 'CABEZA',
    'CU': 'CUELLO',
    'M': 'MAMAS',
    'AR': 'APARATO RESPIRATORIO',
    'ACV': 'APARATO CARDIOVASCULAR',
    'A': 'ABDOMEN',
    'AUG': 'APARATO UROGENITAL',
    'SN': 'SISTEMA NERVIOSO',
};

// Función para formatear nombres de campos
const formatearNombreCampo = (key: string): string => {
    // Remover prefijo
    const sinPrefijo = key.replace(/^[A-Z]+_/, '');
    
    // Convertir de camelCase/PascalCase a texto legible
    return sinPrefijo
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
};

// Función para agrupar campos por sección
const agruparPorSecciones = (record: HCIngresoData): SeccionPDF[] => {
    const seccionesMap: Record<string, Array<{ label: string; valor: string }>> = {};
    
    Object.keys(record).forEach(key => {
        const valor = record[key];
        
        // Ignorar campos vacíos, null, undefined o de sistema
        if (!valor || valor === '' || 
            ['IdHCIngreso', 'NumeroVisita', 'IdSector', 'IdProfecional', 'Fecha', 
             'FechaFormateada', 'HoraFormateada', 'ProfesionalNombre', 'SectorDescripcion',
             'MotivoConsulta', 'EnfermedadActual'].includes(key)) {
            return;
        }
        
        // Buscar el prefijo de la sección
        const match = key.match(/^([A-Z]+)_/);
        if (match) {
            const prefijo = match[1];
            const nombreSeccion = SECCIONES_CONFIG[prefijo];
            
            if (nombreSeccion) {
                if (!seccionesMap[nombreSeccion]) {
                    seccionesMap[nombreSeccion] = [];
                }
                
                seccionesMap[nombreSeccion].push({
                    label: formatearNombreCampo(key),
                    valor: String(valor)
                });
            }
        }
    });
    
    // Convertir a array de secciones
    return Object.keys(seccionesMap).map(titulo => ({
        titulo,
        campos: seccionesMap[titulo]
    }));
};

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
    
    // ===== ENCABEZADO =====
    doc.setFillColor(...colorPrimario);
    doc.rect(10, yPosition, 190, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('HISTORIA CLÍNICA DE INGRESO', 105, yPosition + 8, { align: 'center' });
    yPosition += 15;
    
    // ===== INFORMACIÓN DE LA EMPRESA =====
    if (empresaInfo) {
        doc.setFontSize(9);
        doc.setTextColor(...colorGris);
        doc.setFont('helvetica', 'normal');
        
        const direccion = [empresaInfo.calle, empresaInfo.calle_nro].filter(Boolean).join(' ');
        
        const infoEmpresa = [
            empresaInfo.razonSocial || '',
            direccion || '',
            empresaInfo.localidad || '',
            `CUIT: ${empresaInfo.cuit || '-'}`,
        ].filter(Boolean);
        
        infoEmpresa.forEach(linea => {
            doc.text(linea, 105, yPosition, { align: 'center' });
            yPosition += 4;
        });
        yPosition += 3;
    }
    
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
        
        // Contenido
        doc.setTextColor(...colorTexto);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const motivoLines = doc.splitTextToSize(data.MotivoConsulta, 180);
        doc.text(motivoLines, 15, yPosition);
        yPosition += motivoLines.length * 5 + 5;
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
        
        // Contenido
        doc.setTextColor(...colorTexto);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const enfermedadLines = doc.splitTextToSize(data.EnfermedadActual, 180);
        doc.text(enfermedadLines, 15, yPosition);
        yPosition += enfermedadLines.length * 5 + 5;
    }
    
    // ===== SECCIONES DE EXAMEN FÍSICO =====
    const secciones = agruparPorSecciones(data);
    
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
