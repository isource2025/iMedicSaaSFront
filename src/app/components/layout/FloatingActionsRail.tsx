'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNotificacionesStore } from '@/app/utils/notificacionesStore';
import styles from './FloatingActionsRail.module.css';

const STORAGE_KEY = 'imedic:fab-rail-open';
const NOTIFICATIONS_OPEN_EVENT = 'imedic:notifications-open';
/** Los modales leen este atributo para dejar lugar a la pestaña en mobile. */
const BODY_FLAG = 'fabRailOverModals';

interface FloatingActionsRailProps {
	children: ReactNode;
	ariaLabel: string;
	className?: string;
	/** Queda por encima de los modales (los modales que abren estos botones). */
	overModals?: boolean;
}

/**
 * Botones flotantes plegables: una pestaña pegada al borde derecho (campanita + flecha)
 * los despliega u oculta para que no tapen el contenido.
 * Se renderiza en `body` para que su z-index no dependa del contexto de apilamiento de la página.
 */
export default function FloatingActionsRail({
	children,
	ariaLabel,
	className = '',
	overModals = false,
}: FloatingActionsRailProps) {
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const stackId = useId();
	const notif = useNotificacionesStore();
	/** Se decide una sola vez por montaje: solo anima la primera aparición de la sesión. */
	const animateBellRef = useRef<boolean | null>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!overModals) return;
		document.body.dataset[BODY_FLAG] = '1';
		return () => {
			delete document.body.dataset[BODY_FLAG];
		};
	}, [overModals]);

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

	const bellReady =
		Boolean(notif.userId) && ((notif.countLoaded && notif.bandejaLoaded) || notif.firstLoadTimedOut);
	if (bellReady && animateBellRef.current === null) {
		animateBellRef.current = !notif.entranceShown;
	}
	const pedidos = notif.estudios + notif.interconsultas;
	const hasUnread = notif.count > 0;
	const hasPedidos = pedidos > 0;
	const badgeTotal = hasUnread ? notif.count : pedidos;
	const showBell = bellReady && !open;
	const showLoader = !bellReady && !open;
	const tone = !showBell ? '' : hasUnread ? styles.tabAlert : hasPedidos ? styles.tabPedidos : '';

	const tabLabel = open
		? 'Ocultar acciones rápidas'
		: showLoader
			? 'Mostrar acciones rápidas, cargando notificaciones'
			: `Mostrar acciones rápidas${badgeTotal > 0 ? `, ${badgeTotal} notificaciones` : ''}`;

	if (!mounted) return null;

	return createPortal(
		<div className={`${styles.rail} ${open ? styles.railOpen : ''} ${className}`}>
			<div id={stackId} className={styles.stack} role="group" aria-label={ariaLabel}>
				{children}
			</div>
			<button
				type="button"
				className={`${styles.tab} ${tone}`}
				onClick={toggle}
				aria-expanded={open}
				aria-controls={stackId}
				aria-label={tabLabel}
				title={tabLabel}
			>
				{showLoader ? <span className={styles.tabLoader} aria-hidden /> : null}
				{showBell ? (
					<span className={`${styles.tabBell} ${animateBellRef.current ? styles.tabBellEntrance : ''}`}>
						<svg
							className={hasUnread || hasPedidos ? styles.tabBellRing : undefined}
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.2"
							aria-hidden
						>
							<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
							<path d="M13.73 21a2 2 0 0 1-3.46 0" />
						</svg>
						{badgeTotal > 0 ? (
							<span className={`${styles.tabBadge} ${!hasUnread ? styles.tabBadgePedidos : ''}`} aria-hidden>
								{badgeTotal > 99 ? '99+' : badgeTotal}
							</span>
						) : null}
					</span>
				) : null}
				<svg
					className={styles.tabArrow}
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.8"
					aria-hidden
				>
					<path d="M15 6l-6 6 6 6" />
				</svg>
			</button>
		</div>,
		document.body,
	);
}
