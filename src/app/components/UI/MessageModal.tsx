'use client';

import { useEffect, type SyntheticEvent } from 'react';
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

	// stopPropagation: con createPortal el evento sigue burbujeando en el árbol React
	// y puede cerrar un modal padre (p. ej. AdjuntosModal).
	const stop = (e: SyntheticEvent) => {
		e.stopPropagation();
	};

	return createPortal(
		<div
			className={styles.overlay}
			role="presentation"
			onMouseDown={(e) => {
				stop(e);
				onClose();
			}}
			onClick={stop}
			onPointerDown={stop}
		>
			<div
				className={`${styles.box} ${styles[tone]}`}
				role="alertdialog"
				aria-modal="true"
				aria-label={title}
				onMouseDown={stop}
				onClick={stop}
				onPointerDown={stop}
			>
				<h3 className={`${styles.title} modal-title`}>{title}</h3>
				<p className={styles.text}>{message}</p>
				<div className={styles.actions}>
					<button
						type="button"
						className={styles.btn}
						onClick={(e) => {
							stop(e);
							onClose();
						}}
						onMouseDown={stop}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
