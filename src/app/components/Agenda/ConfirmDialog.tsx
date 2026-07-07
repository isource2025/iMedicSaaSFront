'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './ConfirmDialog.module.css';

interface Props {
	open: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	tone?: 'danger' | 'default';
	busy?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel = 'Confirmar',
	cancelLabel = 'Cancelar',
	tone = 'default',
	busy = false,
	onConfirm,
	onCancel,
}: Props) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && !busy) onCancel();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open, busy, onCancel]);

	if (!open) return null;

	return createPortal(
		<div className={styles.overlay} role='presentation' onMouseDown={() => !busy && onCancel()}>
			<div
				className={styles.box}
				role='alertdialog'
				aria-modal='true'
				aria-label={title}
				onMouseDown={(e) => e.stopPropagation()}
			>
				<h3 className={styles.title}>{title}</h3>
				<p className={styles.text}>{message}</p>
				<div className={styles.actions}>
					<button
						type='button'
						className={styles.btnSecondary}
						onClick={onCancel}
						disabled={busy}
					>
						{cancelLabel}
					</button>
					<button
						type='button'
						className={`${styles.btnPrimary} ${tone === 'danger' ? styles.btnDanger : ''}`}
						onClick={onConfirm}
						disabled={busy}
					>
						{busy ? 'Procesando…' : confirmLabel}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
