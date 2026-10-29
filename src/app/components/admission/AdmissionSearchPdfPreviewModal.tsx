'use client';

import { useEffect, useState } from 'react';
import type { AdmissionSearchRow } from '@/app/services/admissionSearchService';
import { admissionSearchService } from '@/app/services/admissionSearchService';
import PdfPreviewDialog from '@/app/components/pdf/PdfPreviewDialog';

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
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [fileName, setFileName] = useState('admisiones.pdf');

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
				const built = await buildAdmisionesBusquedaPdf({
					rows,
					total: totalExport,
				});
				if (cancel) return;
				objectUrl = URL.createObjectURL(built.blob);
				setFileName(built.fileName);
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

	return (
		<PdfPreviewDialog
			open={isOpen}
			onClose={onClose}
			title="Admisiones — PDF"
			busy={busy}
			error={error}
			url={previewUrl}
			fileName={fileName}
		/>
	);
}
