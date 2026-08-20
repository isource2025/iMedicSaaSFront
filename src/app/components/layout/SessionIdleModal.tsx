'use client';

import { useEffect, useRef, useState } from 'react';
import {
	SESSION_IDLE_EVENT,
	goToLoginFromIdle,
	isSessionIdleOpen,
} from '@/app/utils/sessionIdle';
import { ANALYTICS_EVENTS, trackProductEvent } from '@/app/services/analyticsService';
import styles from './SessionIdleModal.module.css';

export default function SessionIdleModal() {
	const [open, setOpen] = useState(false);
	const openedAt = useRef(0);
	const viewed = useRef(false);

	useEffect(() => {
		if (isSessionIdleOpen()) setOpen(true);
		const onIdle = () => setOpen(true);
		window.addEventListener(SESSION_IDLE_EVENT, onIdle);
		return () => window.removeEventListener(SESSION_IDLE_EVENT, onIdle);
	}, []);

	useEffect(() => {
		if (!open) return;
		openedAt.current = Date.now();
		if (!viewed.current) {
			viewed.current = true;
			trackProductEvent(ANALYTICS_EVENTS.MODAL_VIEWED);
		}

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Enter') finish('login');
			if (e.key === 'Escape') finish('dismiss');
		};
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	}, [open]);

	function dwellMs() {
		return Math.max(0, Date.now() - (openedAt.current || Date.now()));
	}

	function finish(action: 'login' | 'dismiss') {
		trackProductEvent(
			action === 'login' ? ANALYTICS_EVENTS.LOGIN_CLICKED : ANALYTICS_EVENTS.MODAL_DISMISSED,
			{ metadata: { dwellMs: dwellMs() } },
		);
		goToLoginFromIdle();
	}

	if (!open) return null;

	return (
		<div
			className={styles.backdrop}
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="idle-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) finish('dismiss');
			}}
		>
			<div className={styles.card}>
				<p className={styles.kicker}>Seguridad de la sesión</p>
				<h2 id="idle-title" className={styles.title}>
					Sesión finalizada
				</h2>
				<p className={styles.body}>
					Por inactividad, cerramos tu sesión para proteger la información clínica.
				</p>
				<p className={styles.hint}>Iniciá sesión cuando vuelvas.</p>
				<button type="button" className={styles.cta} onClick={() => finish('login')}>
					Iniciar sesión
				</button>
			</div>
		</div>
	);
}
