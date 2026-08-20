'use client';

import styles from './PedidoDetalleModal.module.css';

type DetailField = {
	label: string;
	value?: string | number | null;
	full?: boolean;
};

export type PedidoTextBlock = {
	label: string;
	value?: string | null;
	/** Nombre de quien escribió el pedido / respuesta */
	autor?: string | null;
	fecha?: string | null;
	hora?: string | null;
};

type Props = {
	title: string;
	kicker?: string;
	fields: DetailField[];
	textBlocks?: PedidoTextBlock[];
	urgencia?: string;
	estado?: string;
	onClose: () => void;
	onExportPdf?: () => void | Promise<void>;
	exporting?: boolean;
};

function urgenciaClass(estado?: string) {
	const v = (estado || '').trim().toLowerCase();
	if (v.includes('urgent')) return styles.chipUrgente;
	if (v.includes('medio')) return styles.chipMedio;
	if (v.includes('bajo') || v.includes('normal')) return styles.chipOk;
	return styles.chipMuted;
}

function estadoClass(estado?: string) {
	const v = (estado || '').trim().toLowerCase();
	if (v.includes('cumpl')) return styles.chipOk;
	if (v.includes('tomad')) return styles.chipInfo;
	if (v.includes('pend')) return styles.chipMuted;
	return styles.chipInfo;
}

function displayValue(value?: string | number | null) {
	if (value === null || value === undefined || value === '') return '—';
	return String(value);
}

function hasValue(value?: string | number | null) {
	return value !== null && value !== undefined && String(value).trim() !== '';
}

/** Normaliza fechas ISO / Clarion-friendly a dd/mm/yyyy o fecha+hora local. */
export function formatPedidoFechaHora(
	fecha?: string | null,
	hora?: string | null,
): string | null {
	const fRaw = String(fecha || '').trim();
	const hRaw = String(hora || '').trim();
	if (!fRaw && !hRaw) return null;

	// ISO completo en fecha
	if (/^\d{4}-\d{2}-\d{2}T/.test(fRaw)) {
		const d = new Date(fRaw);
		if (!Number.isNaN(d.getTime())) {
			return d.toLocaleString('es-AR', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		}
	}

	let fechaFmt = fRaw;
	if (/^\d{4}-\d{2}-\d{2}/.test(fRaw)) {
		const [y, m, d] = fRaw.slice(0, 10).split('-');
		fechaFmt = `${d}/${m}/${y}`;
	}

	const horaFmt = hRaw.length >= 5 ? hRaw.slice(0, 5) : hRaw;
	if (fechaFmt && horaFmt) return `${fechaFmt} ${horaFmt}`;
	return fechaFmt || horaFmt || null;
}

function blockMeta(block: PedidoTextBlock): string | null {
	const parts: string[] = [];
	if (hasValue(block.autor)) parts.push(String(block.autor).trim());
	const fh = formatPedidoFechaHora(block.fecha, block.hora);
	if (fh) parts.push(fh);
	return parts.length ? parts.join(' · ') : null;
}

export default function PedidoDetalleModal({
	title,
	kicker,
	fields,
	textBlocks,
	urgencia,
	estado,
	onClose,
	onExportPdf,
	exporting = false,
}: Props) {
	const visibleFields = fields.filter((f) => hasValue(f.value));
	// Mostrar bloques aunque el texto esté vacío (p. ej. sin respuesta aún)
	const blocks = textBlocks || [];

	return (
		<div className={styles.overlay} onClick={onClose} role="presentation">
			<div
				className={styles.dialog}
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="pedido-detalle-title"
			>
				<div className={styles.header}>
					<div className={styles.headerText}>
						{kicker ? <p className={styles.kicker}>{kicker}</p> : null}
						<h3 id="pedido-detalle-title" className={styles.title}>
							{title}
						</h3>
						<div className={styles.chips}>
							{estado ? (
								<span className={`${styles.chip} ${estadoClass(estado)}`}>{estado}</span>
							) : null}
							{urgencia ? (
								<span className={`${styles.chip} ${urgenciaClass(urgencia)}`}>{urgencia}</span>
							) : null}
						</div>
					</div>
					<button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
						✕
					</button>
				</div>

				<div className={styles.body}>
					{blocks.length > 0 ? (
						<div className={styles.blocks}>
							{blocks.map((block) => {
								const meta = blockMeta(block);
								const empty = !hasValue(block.value);
								return (
									<section key={block.label} className={styles.block}>
										<header className={styles.blockHead}>
											<span className={styles.blockLabel}>{block.label}</span>
											{meta ? <span className={styles.blockMeta}>{meta}</span> : null}
										</header>
										<div className={`${styles.text} ${empty ? styles.textEmpty : ''}`}>
											{empty ? 'Sin texto cargado' : String(block.value).trim()}
										</div>
									</section>
								);
							})}
						</div>
					) : null}

					{visibleFields.length > 0 ? (
						<dl className={styles.meta}>
							{visibleFields.map((f) => (
								<div
									key={f.label}
									className={`${styles.metaItem} ${f.full ? styles.metaFull : ''}`}
								>
									<dt className={styles.metaLabel}>{f.label}</dt>
									<dd className={styles.metaValue}>{displayValue(f.value)}</dd>
								</div>
							))}
						</dl>
					) : null}
				</div>

				<div className={styles.footer}>
					{onExportPdf ? (
						<button
							type="button"
							className={styles.btnPrimary}
							disabled={exporting}
							onClick={() => void onExportPdf()}
						>
							{exporting ? 'Generando…' : 'Exportar PDF'}
						</button>
					) : null}
					<button type="button" className={styles.btnSecondary} onClick={onClose}>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
}
