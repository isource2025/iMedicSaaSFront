import jsPDF from 'jspdf';
import { PDF_COLORS, PDF_CONTENT_TOP, PDF_FOOTER_SPACE, PDF_MARGIN_X } from './pdfHeader';

export type Campo = { label: string; valor: string };

/** Bloques de contenido comunes a los PDF clínicos (misma estética en todos). */
export class PdfBloques {
	readonly x0 = PDF_MARGIN_X;
	readonly x1: number;
	readonly width: number;
	y = 0;

	constructor(private doc: jsPDF) {
		this.x1 = doc.internal.pageSize.getWidth() - PDF_MARGIN_X;
		this.width = this.x1 - this.x0;
	}

	ensure(needed: number) {
		const limite = this.doc.internal.pageSize.getHeight() - PDF_FOOTER_SPACE - 2;
		if (this.y + needed > limite) {
			this.doc.addPage();
			this.y = PDF_CONTENT_TOP;
		}
	}

	private font(size: number, style: 'normal' | 'bold' = 'normal', color = PDF_COLORS.text) {
		this.doc.setFont('helvetica', style);
		this.doc.setFontSize(size);
		this.doc.setTextColor(...color);
	}

	/** Franja con datos de la HC (fecha, profesional, sector). */
	meta(celdas: Array<{ label: string; value: string; sub?: string }>) {
		const items = celdas.filter((c) => c.value);
		if (!items.length) return;
		const pad = 4.5;
		const colW = this.width / items.length;
		const textW = colW - 2 * pad;
		this.font(9, 'bold');
		const valores = items.map((c) => (this.doc.splitTextToSize(c.value, textW) as string[]).slice(0, 2));
		const lineas = Math.max(...valores.map((v, i) => v.length + (items[i].sub ? 1 : 0)));
		const h = pad + 2.4 + 4.6 + (lineas - 1) * 4.2 + pad - 1;
		const top = this.y;

		this.doc.setDrawColor(...PDF_COLORS.line);
		this.doc.setLineWidth(0.2);
		this.doc.roundedRect(this.x0, top, this.width, h, 1.5, 1.5, 'S');
		items.forEach((c, i) => {
			const cx = this.x0 + i * colW;
			if (i > 0) this.doc.line(cx, top + 2.5, cx, top + h - 2.5);
			const ly = top + pad + 2.4;
			this.font(6.5, 'bold', PDF_COLORS.muted);
			this.doc.text(c.label.toUpperCase(), cx + pad, ly, { charSpace: 0.3 });
			this.font(9, 'bold', PDF_COLORS.ink);
			this.doc.text(valores[i], cx + pad, ly + 4.6, { lineHeightFactor: 1.3 });
			if (c.sub) {
				this.font(7.5, 'normal', PDF_COLORS.muted);
				this.doc.text(c.sub, cx + pad, ly + 4.6 + valores[i].length * 4.2);
			}
		});
		this.y = top + h + 8;
	}

	capitulo(titulo: string) {
		this.ensure(22);
		this.y += 2;
		this.doc.setFillColor(...PDF_COLORS.brand);
		this.doc.rect(this.x0, this.y - 3.8, 1.1, 5, 'F');
		this.font(11.5, 'bold', PDF_COLORS.ink);
		this.doc.text(titulo, this.x0 + 3.5, this.y);
		this.y += 6.5;
	}

	subtitulo(titulo: string) {
		this.ensure(14);
		this.font(7.5, 'bold', PDF_COLORS.brand);
		const t = titulo.toUpperCase();
		this.doc.text(t, this.x0, this.y, { charSpace: 0.4 });
		const w = this.doc.getTextWidth(t) + 0.4 * (t.length - 1);
		this.doc.setDrawColor(...PDF_COLORS.line);
		this.doc.setLineWidth(0.2);
		this.doc.line(this.x0 + w + 2.5, this.y - 1, this.x1, this.y - 1);
		this.y += 4.6;
	}

	parrafo(texto: string) {
		this.font(9.5, 'normal', PDF_COLORS.ink);
		const lineH = 4.6;
		const lines = this.doc.splitTextToSize(texto, this.width) as string[];
		for (const line of lines) {
			this.ensure(lineH + 1);
			this.doc.text(line, this.x0, this.y);
			this.y += lineH;
		}
		this.y += 3.5;
	}

	/** Tarjetas de valores cortos (signos vitales). */
	tarjetas(campos: Campo[]) {
		const porFila = campos.length <= 7 ? Math.max(campos.length, 5) : Math.ceil(campos.length / 2);
		const gap = 2.5;
		const w = (this.width - gap * (porFila - 1)) / porFila;
		const h = 12.5;
		for (let i = 0; i < campos.length; i += porFila) {
			this.ensure(h + 2);
			campos.slice(i, i + porFila).forEach((c, j) => {
				const cx = this.x0 + j * (w + gap);
				this.doc.setFillColor(...PDF_COLORS.panel);
				this.doc.setDrawColor(...PDF_COLORS.line);
				this.doc.setLineWidth(0.2);
				this.doc.roundedRect(cx, this.y, w, h, 1.2, 1.2, 'FD');
				this.font(6.3, 'bold', PDF_COLORS.muted);
				const label = this.doc.splitTextToSize(c.label.toUpperCase(), w - 4)[0] as string;
				this.doc.text(label, cx + 2.2, this.y + 4.2);
				let size = 10.5;
				this.font(size, 'bold', PDF_COLORS.ink);
				while (size > 7.5 && this.doc.getTextWidth(c.valor) > w - 4) {
					size -= 0.5;
					this.doc.setFontSize(size);
				}
				const valor = this.doc.splitTextToSize(c.valor, w - 4)[0] as string;
				this.doc.text(valor, cx + 2.2, this.y + 9.6);
			});
			this.y += h + gap;
		}
		this.y += 2;
	}

	/** Pares etiqueta/valor en dos columnas; los valores largos ocupan el ancho completo. */
	campos(campos: Campo[]) {
		const gap = 6;
		const colW = (this.width - gap) / 2;
		const lineH = 4.2;
		const medir = (c: Campo, ancho: number) => {
			this.font(8.8, 'bold');
			const labelW = this.doc.getTextWidth(`${c.label}: `);
			this.font(8.8, 'normal');
			const enLinea = labelW < ancho * 0.5;
			const lines = this.doc.splitTextToSize(c.valor, enLinea ? ancho - labelW : ancho) as string[];
			return { labelW, enLinea, lines, alto: (enLinea ? lines.length : lines.length + 1) * lineH };
		};
		const dibujar = (c: Campo, x: number, ancho: number) => {
			const m = medir(c, ancho);
			this.font(8.8, 'bold', PDF_COLORS.muted);
			this.doc.text(`${c.label}:`, x, this.y);
			this.font(8.8, 'normal', PDF_COLORS.ink);
			if (m.enLinea) this.doc.text(m.lines, x + m.labelW, this.y);
			else this.doc.text(m.lines, x, this.y + lineH);
			return m.alto;
		};

		let i = 0;
		while (i < campos.length) {
			const a = campos[i];
			const b = campos[i + 1];
			const ma = medir(a, colW);
			const mb = b ? medir(b, colW) : null;
			const aCorto = ma.lines.length <= 2;
			const bCorto = mb ? mb.lines.length <= 2 : false;
			if (b && aCorto && bCorto) {
				const alto = Math.max(ma.alto, mb!.alto);
				this.ensure(alto + 1);
				dibujar(a, this.x0, colW);
				dibujar(b, this.x0 + colW + gap, colW);
				this.y += alto + 1.2;
				i += 2;
			} else {
				const m = medir(a, this.width);
				if (m.lines.length <= 3) {
					this.ensure(m.alto + 1);
					this.y += dibujar(a, this.x0, this.width) + 1.2;
				} else {
					this.ensure(lineH * 3);
					this.font(8.8, 'bold', PDF_COLORS.muted);
					this.doc.text(`${a.label}:`, this.x0, this.y);
					this.y += lineH;
					this.font(8.8, 'normal', PDF_COLORS.ink);
					for (const line of this.doc.splitTextToSize(a.valor, this.width) as string[]) {
						this.ensure(lineH + 1);
						this.doc.text(line, this.x0, this.y);
						this.y += lineH;
					}
					this.y += 1.2;
				}
				i += 1;
			}
		}
		this.y += 3;
	}

	/** Ítems numerados (PT_1, PT_2…): lista en una columna. */
	lista(campos: Campo[]) {
		const lineH = 4.4;
		const sangria = 6;
		for (const c of campos) {
			this.font(9.2, 'normal', PDF_COLORS.ink);
			const lines = this.doc.splitTextToSize(c.valor, this.width - sangria) as string[];
			this.ensure(Math.min(lines.length, 3) * lineH + 1);
			this.font(9.2, 'bold', PDF_COLORS.brand);
			this.doc.text(`${c.label}.`, this.x0, this.y);
			this.font(9.2, 'normal', PDF_COLORS.ink);
			lines.forEach((line, i) => {
				if (i > 0) this.ensure(lineH + 1);
				this.doc.text(line, this.x0 + sangria, this.y);
				this.y += lineH;
			});
			this.y += 1;
		}
		this.y += 2.5;
	}

	espacio(mm: number) {
		this.y += mm;
	}
}
