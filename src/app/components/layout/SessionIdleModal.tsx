'use client';

import { useEffect, useState } from 'react';
import {
	SESSION_IDLE_EVENT,
	goToLoginFromIdle,
	isSessionIdleOpen,
} from '@/app/utils/sessionIdle';
import styles from './SessionIdleModal.module.css';

export default function SessionIdleModal() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (isSessionIdleOpen()) setOpen(true);
		const onIdle = () => setOpen(true);
		window.addEventListener(SESSION_IDLE_EVENT, onIdle);
		return () => window.removeEventListener(SESSION_IDLE_EVENT, onIdle);
	}, []);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === 'Escape') goToLoginFromIdle();
		};
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	}, [open]);

	if (!open) return null;

	return (
		<div className={styles.backdrop} role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
			<div className={styles.card}>
				<p className={styles.kicker}>Seguridad de la sesión</p>
				<h2 id="idle-title" className={styles.title}>
					Sesión finalizada
				</h2>
				<p className={styles.body}>
					Por inactividad, cerramos tu sesión para proteger la información clínica.
				</p>
				<p className={styles.hint}>Iniciá sesión cuando vuelvas.</p>
				<button type="button" className={styles.cta} onClick={goToLoginFromIdle}>
					Iniciar sesión
				</button>
			</div>
		</div>
	);
}
