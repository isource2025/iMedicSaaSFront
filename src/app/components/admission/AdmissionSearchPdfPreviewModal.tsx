'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdmissionSearchRow } from '@/app/services/admissionSearchService';
import { admissionSearchService } from '@/app/services/admissionSearchService';
import styles from './AdmissionSearchPdfPreviewModal.module.css';

type SearchFiltersLite = {
	termino: string;
	fechaInicio: string;
	fechaFin: string;
	porIngreso: boolean;
	porEgreso: boolean;
	tipoAtencion: '' | 'I' | 'A';
	cliente: string;
};

type Props = {
	isOpen: boolean;
	onClose: () => void;
	/** Filtros activos (los de la URL / búsqueda). */
	filtros: SearchFiltersLite;
	/** Filas ya en pantalla (fallback si falla el fetch ampliado). */
	rowsActuales: AdmissionSearchRow[];
	total: number;
};

const EXPORT_LIMIT = 250;

export default function AdmissionSearchPdfPreviewModal({
	isOpen,
	onClose,
	filtros,
	rowsActuales,
	total,
}: Props) {
	const dialogRef = useRef<HTMLDivElement>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				onClose();
			}
		};
		document.addEventListener('keydown', onKey, true);
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey, true);
			document.body.style.overflow = 'unset';
		};
	}, [isOpen, onClose]);

	useEffect(() => {
		if (!isOpen) {
			setPreviewUrl((prev) => {
				if (prev) URL.revokeObjectURL(prev);
				return null;
			});
			setError('');
			setBusy(false);
			return;
		}

		let cancel = false;
		let objectUrl: string | null = null;

		const run = async () => {
			setBusy(true);
			setError('');
			setPreviewUrl((prev) => {
				if (prev) URL.revokeObjectURL(prev);
				return null;
			});
			try {
				let rows = rowsActuales;
				let totalExport = total;
				try {
					const res = await admissionSearchService.buscar({
						termino: filtros.termino || undefined,
						fechaInicio: filtros.fechaInicio || undefined,
						fechaFin: filtros.fechaFin || undefined,
						porIngreso: filtros.porIngreso || undefined,
						porEgreso: filtros.porEgreso || undefined,
						tipoAtencion: filtros.tipoAtencion || undefined,
						cliente: filtros.cliente || undefined,
						page: 1,
						limit: EXPORT_LIMIT,
					});
					rows = res.data || [];
					totalExport = res.pagination?.total ?? total;
				} catch {
					rows = rowsActuales;
					totalExport = total;
				}

				if (cancel) return;
				if (!rows.length) {
					setError('No hay resultados para exportar con los filtros actuales.');
					return;
				}

				const { buildAdmisionesBusquedaPdf } = await import('@/app/utils/pdfAdmisionesBusqueda');
				const { blob } = await buildAdmisionesBusquedaPdf({
					rows,
					total: totalExport,
				});
				if (cancel) return;
				objectUrl = URL.createObjectURL(blob);
				setPreviewUrl(objectUrl);
			} catch (e: unknown) {
				if (!cancel) {
					setError(e instanceof Error ? e.message : 'No se pudo generar el PDF');
				}
			} finally {
				if (!cancel) setBusy(false);
			}
		};

		void run();

		return () => {
			cancel = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
		// Solo regenera al abrir; los props se leen del cierre actual.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	if (!isOpen) return null;

	const handleBackdrop = (e: React.MouseEvent) => {
		if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) onClose();
	};

	return (
		<div className={styles.overlay} onClick={handleBackdrop} role="presentation">
			<div
				className={styles.dialog}
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label="Previsualización PDF"
			>
				<button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
					✕
				</button>
				{busy ? (
					<div className={styles.centerMsg}>Generando PDF…</div>
				) : error ? (
					<div className={styles.centerMsg}>
						<span className={styles.error}>{error}</span>
					</div>
				) : previewUrl ? (
					<iframe title="Previsualización del PDF" className={styles.previewFrame} src={previewUrl} />
				) : (
					<div className={styles.centerMsg}>Sin vista previa</div>
				)}
			</div>
		</div>
	);
}
