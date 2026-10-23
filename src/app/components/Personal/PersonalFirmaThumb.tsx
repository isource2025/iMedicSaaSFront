'use client';

import { useEffect, useState } from 'react';
import { getPersonalFirmaByIdPublic } from '@/app/services/personalService';
import styles from './PersonalFirmaThumb.module.css';

/** Cache de sesión: evita refetch al paginar / re-render. */
const cache = new Map<number, string | null>();

type Props = {
	id: number;
	hasFirma?: boolean;
	/** Variante más chica para mobile. */
	compact?: boolean;
};

/**
 * Miniatura de firma digital (misma imagen que usan los PDF).
 * Solo pide el blob si hasFirma; si falla, deja el hueco vacío.
 */
export default function PersonalFirmaThumb({ id, hasFirma, compact }: Props) {
	const [src, setSrc] = useState<string | null>(() =>
		hasFirma && cache.has(id) ? cache.get(id) ?? null : null,
	);
	const [loading, setLoading] = useState(Boolean(hasFirma && !cache.has(id)));

	useEffect(() => {
		if (!hasFirma) {
			setSrc(null);
			setLoading(false);
			return;
		}
		if (cache.has(id)) {
			setSrc(cache.get(id) ?? null);
			setLoading(false);
			return;
		}
		let cancelled = false;
		setLoading(true);
		void getPersonalFirmaByIdPublic(id)
			.then((r) => {
				const url = r.hasFirma && r.dataUrl ? r.dataUrl : null;
				cache.set(id, url);
				if (!cancelled) {
					setSrc(url);
					setLoading(false);
				}
			})
			.catch(() => {
				cache.set(id, null);
				if (!cancelled) {
					setSrc(null);
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [id, hasFirma]);

	if (!hasFirma) {
		return (
			<span className={styles.empty} aria-hidden>
				—
			</span>
		);
	}

	if (loading && !src) {
		return (
			<span
				className={`${styles.frame} ${compact ? styles.frameCompact : ''} ${styles.skeleton}`}
				aria-label='Cargando firma'
			/>
		);
	}

	if (!src) {
		return (
			<span className={styles.empty} title='Firma no disponible'>
				—
			</span>
		);
	}

	return (
		<span
			className={`${styles.frame} ${compact ? styles.frameCompact : ''}`}
			title='Firma digital enrolada'
		>
			{/* alt vacío: el nombre ya está en la fila; es decorativo-explicativo */}
			<img src={src} alt='' className={styles.img} draggable={false} />
		</span>
	);
}
