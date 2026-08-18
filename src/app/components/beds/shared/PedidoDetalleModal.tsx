'use client';

import styles from './PedidoDetalleModal.module.css';

type DetailField = {
	label: string;
	value?: string | number | null;
	full?: boolean;
};

type Props = {
	title: string;
	kicker?: string;
	fields: DetailField[];
	textBlocks?: { label: string; value?: string | null }[];
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
	const visibleBlocks = (textBlocks || []).filter((b) => hasValue(b.value));

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
					{visibleFields.length > 0 ? (
						<div className={styles.grid}>
							{visibleFields.map((f) => (
								<div
									key={f.label}
									className={`${styles.item} ${f.full ? styles.itemFull : ''}`}
								>
									<span className={styles.label}>{f.label}</span>
									<span className={styles.value}>{displayValue(f.value)}</span>
								</div>
							))}
						</div>
					) : null}

					{visibleBlocks.map((block) => (
						<div key={block.label} className={styles.block}>
							<span className={styles.label}>{block.label}</span>
							<div className={styles.text}>{String(block.value).trim()}</div>
						</div>
					))}
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
