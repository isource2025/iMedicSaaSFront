'use client';

import { useEffect, useState } from 'react';
import { getPersonalFirmaByIdPublic } from '@/app/services/personalService';
import styles from './PersonalFirmaThumb.module.css';

/** Cache de sesión: evita refetch al paginar / re-render. */
const cache = new Map<number, string | null>();

/** Invalidar tras guardar/borrar firma en el modal. */
export function invalidateFirmaThumbCache(id?: number) {
	if (id == null) cache.clear();
	else cache.delete(id);
}

type Props = {
	id: number;
	hasFirma?: boolean;
	/** Variante más chica para mobile. */
	compact?: boolean;
	/** Abre el modal de edición de firma. */
	onEdit?: () => void;
	/** Subir tras guardar/borrar para forzar refetch (cache invalidado). */
	revision?: number;
};

/**
 * Miniatura de firma digital (misma imagen que usan los PDF).
 * Solo pide el blob si hasFirma; si falla, deja el hueco vacío.
 */
export default function PersonalFirmaThumb({
	id,
	hasFirma,
	compact,
	onEdit,
	revision = 0,
}: Props) {
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
	}, [id, hasFirma, revision]);

	const frameClass = `${styles.frame} ${compact ? styles.frameCompact : ''} ${
		onEdit ? styles.frameClickable : ''
	}`;

	if (!hasFirma) {
		if (onEdit) {
			return (
				<button
					type='button'
					className={`${styles.emptyBtn} ${compact ? styles.emptyBtnCompact : ''}`}
					onClick={(e) => {
						e.stopPropagation();
						onEdit();
					}}
					title='Enrolar firma digital'
					aria-label='Enrolar firma digital'
				>
					Sin firma
				</button>
			);
		}
		return (
			<span className={styles.empty} aria-hidden>
				—
			</span>
		);
	}

	if (loading && !src) {
		return (
			<span className={`${frameClass} ${styles.skeleton}`} aria-label='Cargando firma' />
		);
	}

	if (!src) {
		if (onEdit) {
			return (
				<button
					type='button'
					className={`${styles.emptyBtn} ${compact ? styles.emptyBtnCompact : ''}`}
					onClick={(e) => {
						e.stopPropagation();
						onEdit();
					}}
					title='Editar firma digital'
					aria-label='Editar firma digital'
				>
					Ver firma
				</button>
			);
		}
		return (
			<span className={styles.empty} title='Firma no disponible'>
				—
			</span>
		);
	}

	if (onEdit) {
		return (
			<button
				type='button'
				className={frameClass}
				onClick={(e) => {
					e.stopPropagation();
					onEdit();
				}}
				title='Editar firma digital'
				aria-label='Editar firma digital'
			>
				<img src={src} alt='' className={styles.img} draggable={false} />
			</button>
		);
	}

	return (
		<span className={frameClass} title='Firma digital enrolada'>
			<img src={src} alt='' className={styles.img} draggable={false} />
		</span>
	);
}
