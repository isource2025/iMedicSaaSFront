import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AdmisionVigente } from '@/app/services/admisionesVigentesService';

export type GrupoAdmisionVigente = {
	clave: string;
	titulo: string;
	filas: AdmisionVigente[];
};

function fechaCorta(iso: string | null): string {
	if (!iso) return '—';
	const [y, m, d] = iso.split('-');
	return y && m && d ? `${d}/${m}/${y}` : iso;
}

function edadSexo(a: AdmisionVigente): string {
	const partes = [a.edad != null ? `${a.edad} a` : '', a.sexo ? a.sexo.charAt(0) : ''];
	return partes.filter(Boolean).join(' · ') || '—';
}

function ahoraEsAr(): string {
	return new Date().toLocaleString('es-AR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function descripcionSectoresSeleccionados(
	grupos: GrupoAdmisionVigente[],
	totalSectores: number,
): string {
	if (grupos.length === 0) return '';
	if (grupos.length === totalSectores) return 'Todos los sectores';
	if (grupos.length <= 3) return grupos.map((g) => g.titulo).join(', ');
	return `${grupos.length} sectores`;
}

/** PDF apaisado con una tabla por sector (misma info que la impresión). */
export async function generarPDFAdmisionesVigentes(opts: {
	grupos: GrupoAdmisionVigente[];
	filtro?: string;
}): Promise<void> {
	const { grupos, filtro = '' } = opts;
	const total = grupos.reduce((n, g) => n + g.filas.length, 0);
	const ahora = ahoraEsAr();

	const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
	const margenX = 10;
	const pageW = doc.internal.pageSize.getWidth();
	const pageH = doc.internal.pageSize.getHeight();

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(14);
	doc.setTextColor(17, 17, 17);
	doc.text('Admisiones vigentes · Recorrido de sala', margenX, 12);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	doc.setTextColor(85, 85, 85);
	const meta = [
		ahora,
		`${total} paciente${total === 1 ? '' : 's'}`,
		filtro || null,
	]
		.filter(Boolean)
		.join(' · ');
	doc.text(meta, margenX, 18);

	let cursorY = 22;

	for (const g of grupos) {
		if (cursorY > pageH - 28) {
			doc.addPage();
			cursorY = 12;
		}

		doc.setFont('helvetica', 'bold');
		doc.setFontSize(11);
		doc.setTextColor(17, 17, 17);
		doc.text(`${g.titulo} (${g.filas.length})`, margenX, cursorY);
		cursorY += 2;

		autoTable(doc, {
			startY: cursorY,
			margin: { left: margenX, right: margenX, top: 10, bottom: 10 },
			theme: 'grid',
			styles: {
				font: 'helvetica',
				fontSize: 7.5,
				cellPadding: 1.2,
				valign: 'top',
				textColor: [17, 17, 17],
				lineColor: [153, 153, 153],
				lineWidth: 0.2,
				overflow: 'linebreak',
			},
			headStyles: {
				fillColor: [238, 238, 238],
				textColor: [17, 17, 17],
				fontStyle: 'bold',
				fontSize: 7.5,
			},
			columnStyles: {
				0: { cellWidth: 14 },
				1: { cellWidth: 42 },
				2: { cellWidth: 22 },
				3: { cellWidth: 14 },
				4: { cellWidth: 18 },
				5: { cellWidth: 10 },
				6: { cellWidth: 40 },
				7: { cellWidth: 32 },
				8: { cellWidth: 28 },
				9: { cellWidth: pageW - margenX * 2 - 14 - 42 - 22 - 14 - 18 - 10 - 40 - 32 - 28 },
			},
			head: [
				[
					'Cama',
					'Paciente',
					'DNI',
					'Edad',
					'Ingreso',
					'Días',
					'Diagnóstico',
					'Cobertura',
					'Médico',
					'Notas',
				],
			],
			body: g.filas.map((f) => [
				f.cama || '—',
				`${f.paciente || '—'}\nVisita ${f.numeroVisita}`,
				f.documento || '—',
				edadSexo(f),
				fechaCorta(f.fechaIngreso),
				f.diasInternacion ?? '—',
				f.diagnostico || '—',
				f.cobertura || '—',
				f.medico || '—',
				'',
			]),
			didParseCell: (data) => {
				if (data.section === 'body' && data.column.index === 1) {
					data.cell.styles.fontStyle = 'bold';
				}
			},
		});

		const last = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
		cursorY = (last?.finalY ?? cursorY) + 8;
	}

	const stamp = ahora.replace(/[/,: ]/g, '-');
	doc.save(`admisiones-vigentes_${stamp}.pdf`);
}
