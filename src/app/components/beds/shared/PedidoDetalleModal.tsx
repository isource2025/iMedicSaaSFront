'use client';

import styles from './PedidoDetalleModal.module.css';

type DetailField = {
	label: string;
	value?: string | number | null;
	full?: boolean;
};

type Props = {
	title: string;
	fields: DetailField[];
	textBlocks?: { label: string; value?: string | null }[];
	urgencia?: string;
	onClose: () => void;
};

function urgenciaClass(estado?: string) {
	const v = (estado || '').trim().toLowerCase();
	if (v.includes('urgent')) return styles.urgenciaUrgente;
	if (v.includes('medio')) return styles.urgenciaMedio;
	if (v.includes('bajo') || v.includes('normal')) return styles.urgenciaBajo;
	return styles.urgenciaNone;
}

function displayValue(value?: string | number | null) {
	if (value === null || value === undefined || value === '') return '—';
	return String(value);
}

export default function PedidoDetalleModal({ title, fields, textBlocks, urgencia, onClose }: Props) {
	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h3>
						{title}
						{urgencia && (
							<>
								{' '}
								<span className={`${styles.urgenciaBadge} ${urgenciaClass(urgencia)}`}>
									{urgencia}
								</span>
							</>
						)}
					</h3>
					<button type="button" className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>
				<div className={styles.modalBody}>
					<div className={styles.detailGrid}>
						{fields.map((f) => (
							<div
								key={f.label}
								className={`${styles.detailItem} ${f.full ? styles.detailItemFull : ''}`}
							>
								<span className={styles.detailLabel}>{f.label}</span>
								<span className={styles.detailValue}>{displayValue(f.value)}</span>
							</div>
						))}
					</div>
					{textBlocks?.map((block) => (
						<div key={block.label} className={styles.detailItem} style={{ marginTop: '1rem' }}>
							<span className={styles.detailLabel}>{block.label}</span>
							<div className={styles.textBlock}>{block.value?.trim() || '—'}</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
