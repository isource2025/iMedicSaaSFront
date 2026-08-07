'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './MessageModal.module.css';

export type MessageModalTone = 'info' | 'success' | 'warning' | 'error';

export type MessageModalProps = {
	open: boolean;
	title: string;
	message: string;
	tone?: MessageModalTone;
	confirmLabel?: string;
	onClose: () => void;
};

export default function MessageModal({
	open,
	title,
	message,
	tone = 'info',
	confirmLabel = 'Aceptar',
	onClose,
}: MessageModalProps) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open) return null;

	return createPortal(
		<div
			className={styles.overlay}
			role="presentation"
			onMouseDown={onClose}
		>
			<div
				className={`${styles.box} ${styles[tone]}`}
				role="alertdialog"
				aria-modal="true"
				aria-label={title}
				onMouseDown={(e) => e.stopPropagation()}
			>
				<h3 className={styles.title}>{title}</h3>
				<p className={styles.text}>{message}</p>
				<div className={styles.actions}>
					<button type="button" className={styles.btn} onClick={onClose}>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
