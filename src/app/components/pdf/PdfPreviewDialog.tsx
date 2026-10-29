'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './PdfPreviewDialog.module.css';

type Props = {
	open: boolean;
	onClose: () => void;
	title?: string;
	busy?: boolean;
	error?: string;
	url: string | null;
	fileName?: string;
	children?: ReactNode;
};

export default function PdfPreviewDialog({
	open,
	onClose,
	title = 'Previsualización PDF',
	busy = false,
	error = '',
	url,
	fileName = 'documento.pdf',
	children,
}: Props) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				onClose();
			}
		};
		document.addEventListener('keydown', onKey, true);
		const prevBody = document.body.style.overflow;
		const main = document.querySelector('main');
		const prevMain = main instanceof HTMLElement ? main.style.overflow : '';
		document.body.style.overflow = 'hidden';
		if (main instanceof HTMLElement) main.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey, true);
			document.body.style.overflow = prevBody;
			if (main instanceof HTMLElement) main.style.overflow = prevMain;
		};
	}, [open, onClose]);

	if (!open || !mounted) return null;

	const handleBackdrop = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) onClose();
	};

	return createPortal(
		<div className={styles.overlay} onClick={handleBackdrop} role="presentation">
			<div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}>
				<header className={styles.header}>
					<h2 className={styles.title}>{title}</h2>
					<div className={styles.actions}>
						{url ? (
							<a className={styles.btnDownload} href={url} download={fileName}>
								Descargar
							</a>
						) : null}
						<button type="button" className={styles.btnClose} onClick={onClose}>
							Cerrar
						</button>
					</div>
				</header>
				{children ? <div className={styles.extra}>{children}</div> : null}
				<div className={styles.body}>
					{busy ? (
						<div className={styles.centerMsg}>Generando PDF…</div>
					) : error ? (
						<div className={styles.centerMsg}>
							<span className={styles.error}>{error}</span>
						</div>
					) : url ? (
						<iframe title={title} className={styles.previewFrame} src={url} />
					) : (
						<div className={styles.centerMsg}>Sin vista previa</div>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}
