'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import styles from './FloatingActionsRail.module.css';

const STORAGE_KEY = 'imedic:fab-rail-open';
const NOTIFICATIONS_OPEN_EVENT = 'imedic:notifications-open';

interface FloatingActionsRailProps {
	children: ReactNode;
	ariaLabel: string;
	className?: string;
}

/**
 * Botones flotantes plegables: una pestaña con flecha pegada al borde derecho
 * los despliega u oculta para que no tapen el contenido.
 */
export default function FloatingActionsRail({ children, ariaLabel, className = '' }: FloatingActionsRailProps) {
	const [open, setOpen] = useState(false);
	const stackId = useId();

	useEffect(() => {
		try {
			setOpen(window.localStorage.getItem(STORAGE_KEY) === '1');
		} catch {
			/* sin storage: queda plegado */
		}
	}, []);

	useEffect(() => {
		const onNotificationsOpen = () => setOpen(true);
		window.addEventListener(NOTIFICATIONS_OPEN_EVENT, onNotificationsOpen);
		return () => window.removeEventListener(NOTIFICATIONS_OPEN_EVENT, onNotificationsOpen);
	}, []);

	const toggle = () => {
		setOpen((prev) => {
			const next = !prev;
			try {
				window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
			} catch {
				/* noop */
			}
			return next;
		});
	};

	const tabLabel = open ? 'Ocultar acciones rápidas' : 'Mostrar acciones rápidas';

	return (
		<div className={`${styles.rail} ${open ? styles.railOpen : ''} ${className}`}>
			<div id={stackId} className={styles.stack} role="group" aria-label={ariaLabel}>
				{children}
			</div>
			<button
				type="button"
				className={styles.tab}
				onClick={toggle}
				aria-expanded={open}
				aria-controls={stackId}
				aria-label={tabLabel}
				title={tabLabel}
			>
				<svg
					className={styles.tabArrow}
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.6"
					aria-hidden
				>
					<path d="M15 6l-6 6 6 6" />
				</svg>
			</button>
		</div>
	);
}
