'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
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
	/** Zoom inicial del visor (p. ej. 200). Usa el hash `#zoom=` del PDF embebido. */
	zoomPercent?: number;
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
	zoomPercent,
	children,
}: Props) {
	const [mounted, setMounted] = useState(false);
	const dialogRef = useRef<HTMLDivElement>(null);
	const closeBtnRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	const focusDialog = () => {
		// Preferir el botón Cerrar: Escape llega al documento y cierra el modal.
		closeBtnRef.current?.focus({ preventScroll: true });
		if (document.activeElement !== closeBtnRef.current) {
			dialogRef.current?.focus({ preventScroll: true });
		}
	};

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			e.preventDefault();
			e.stopPropagation();
			onClose();
		};
		// capture en window: Escape cierra aunque el foco esté en el chrome del modal
		window.addEventListener('keydown', onKey, true);
		document.addEventListener('keydown', onKey, true);
		const prevBody = document.body.style.overflow;
		const main = document.querySelector('main');
		const prevMain = main instanceof HTMLElement ? main.style.overflow : '';
		document.body.style.overflow = 'hidden';
		if (main instanceof HTMLElement) main.style.overflow = 'hidden';
		const t = window.setTimeout(focusDialog, 0);
		return () => {
			window.clearTimeout(t);
			window.removeEventListener('keydown', onKey, true);
			document.removeEventListener('keydown', onKey, true);
			document.body.style.overflow = prevBody;
			if (main instanceof HTMLElement) main.style.overflow = prevMain;
		};
	}, [open, onClose]);

	useEffect(() => {
		if (!open || busy || !url) return;
		const t = window.setTimeout(focusDialog, 50);
		return () => window.clearTimeout(t);
	}, [open, busy, url]);

	if (!open || !mounted) return null;

	const handleBackdrop = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) onClose();
	};

	const zoom =
		typeof zoomPercent === 'number' && Number.isFinite(zoomPercent) && zoomPercent > 0
			? Math.round(zoomPercent)
			: null;
	const previewSrc =
		url && zoom != null ? `${url}${url.includes('#') ? '&' : '#'}zoom=${zoom}` : url;

	return createPortal(
		<div className={styles.overlay} onClick={handleBackdrop} role="presentation">
			<div
				ref={dialogRef}
				className={styles.dialog}
				role="dialog"
				aria-modal="true"
				aria-label={title}
				tabIndex={-1}
				onKeyDown={(e) => {
					if (e.key === 'Escape') {
						e.preventDefault();
						e.stopPropagation();
						onClose();
					}
				}}
			>
				<header className={styles.header}>
					<h2 className={styles.title}>{title}</h2>
					<div className={styles.actions}>
						{url ? (
							<a className={styles.btnDownload} href={url} download={fileName}>
								Descargar
							</a>
						) : null}
						<button
							ref={closeBtnRef}
							type="button"
							className={styles.btnClose}
							onClick={onClose}
						>
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
					) : previewSrc ? (
						<iframe
							title={title}
							className={styles.previewFrame}
							src={previewSrc}
							// Evita que el visor PDF robe el foco y Escape deje de cerrar el modal.
							onMouseDown={(e) => e.preventDefault()}
							onLoad={focusDialog}
						/>
					) : (
						<div className={styles.centerMsg}>Sin vista previa</div>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}
