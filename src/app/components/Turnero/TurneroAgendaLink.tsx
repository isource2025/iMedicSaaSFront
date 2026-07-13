'use client';

import { useEffect, useRef, useState } from 'react';
import { turneroService } from '@/app/services/turneroService';
import type { TurneroPantallaLink } from '@/app/types/turnero';
import styles from './TurneroAgendaLink.module.css';

function resolveHref(displayPath: string): string {
	if (displayPath.startsWith('http')) return displayPath;
	if (typeof window !== 'undefined') {
		return `${window.location.origin}${displayPath.startsWith('/') ? '' : '/'}${displayPath}`;
	}
	return displayPath;
}

export default function TurneroAgendaLink() {
	const [pantallas, setPantallas] = useState<TurneroPantallaLink[]>([]);
	const [open, setOpen] = useState(false);
	const [error, setError] = useState(false);
	const wrapRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		turneroService
			.getDisplayUrl()
			.then((d) => setPantallas(d.pantallas?.length ? d.pantallas : []))
			.catch(() => setError(true));
	}, []);

	useEffect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener('mousedown', onDoc);
		return () => document.removeEventListener('mousedown', onDoc);
	}, [open]);

	if (error || pantallas.length === 0) return null;

	const principal = pantallas[0];

	if (pantallas.length === 1) {
		return (
			<a
				className={styles.link}
				href={resolveHref(principal.displayPath)}
				target="_blank"
				rel="noopener noreferrer"
				title="Abrir pantalla de llamados"
			>
				<span className={styles.icon}>📺</span>
				Pantalla turnero
			</a>
		);
	}

	return (
		<div className={styles.wrap} ref={wrapRef}>
			<button
				type="button"
				className={styles.linkBtn}
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				aria-haspopup="menu"
			>
				<span className={styles.icon}>📺</span>
				Pantalla turnero
				<span className={styles.chevron}>{open ? '▴' : '▾'}</span>
			</button>
			{open && (
				<div className={styles.menu} role="menu">
					{pantallas.map((p) => (
						<a
							key={p.idPantalla}
							className={styles.menuItem}
							href={resolveHref(p.displayPath)}
							target="_blank"
							rel="noopener noreferrer"
							role="menuitem"
							title={p.sectoresResumen}
							onClick={() => setOpen(false)}
						>
							<span className={styles.menuNombre}>{p.nombre}</span>
							<span className={styles.menuSector}>{p.sectoresResumen}</span>
						</a>
					))}
				</div>
			)}
		</div>
	);
}
