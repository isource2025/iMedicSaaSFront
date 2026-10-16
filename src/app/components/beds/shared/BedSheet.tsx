'use client';

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IoClose } from 'react-icons/io5';
import styles from './BedSheet.module.css';

type Props = {
	title: string;
	onClose: () => void;
	headerExtra?: ReactNode;
	wide?: boolean;
	children: ReactNode;
};

/** Hoja del detalle de cama: sube desde abajo en mobile, diálogo centrado en desktop. */
export default function BedSheet({ title, onClose, headerExtra, wide, children }: Props) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		const overflowPrevio = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = overflowPrevio;
		};
	}, [onClose]);

	return createPortal(
		<div className={styles.overlay} onClick={onClose}>
			<div
				className={`${styles.sheet} ${wide ? styles.sheetWide : ''}`}
				role='dialog'
				aria-modal='true'
				aria-label={title}
				onClick={(e) => e.stopPropagation()}
			>
				<div className={styles.head}>
					<span className={styles.title}>{title}</span>
					{headerExtra}
					<button type='button' className={styles.close} onClick={onClose} aria-label='Cerrar'>
						<IoClose aria-hidden />
					</button>
				</div>
				<div className={styles.body}>{children}</div>
			</div>
		</div>,
		document.body,
	);
}
