'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './SlideDrawer.module.css';

interface SlideDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
}

export default function SlideDrawer({
	isOpen,
	onClose,
	title,
	children,
	footer,
}: SlideDrawerProps) {
	const drawerRef = useRef<HTMLDivElement>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => { setMounted(true); }, []);

	// Close on Escape
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) onClose();
		};
		document.addEventListener('keydown', handleKey);
		return () => document.removeEventListener('keydown', handleKey);
	}, [isOpen, onClose]);

	// Prevent body scroll when open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [isOpen]);

	if (!mounted) return null;

	return createPortal(
		<>
			{/* Overlay */}
			<div
				className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
				onClick={onClose}
			/>

			{/* Drawer */}
			<div
				ref={drawerRef}
				className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
			>
				<div className={styles.drawerHeader}>
					<h3 className={styles.drawerTitle}>{title}</h3>
					<button
						className={styles.drawerClose}
						onClick={onClose}
						aria-label="Cerrar"
					>
						✕
					</button>
				</div>

				<div className={styles.drawerBody} data-modal-root="true" role="dialog">{children}</div>

				{footer && <div className={styles.drawerFooter}>{footer}</div>}
			</div>
		</>,
		document.body
	);
}
