'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AdmisionVigente } from '@/app/services/admisionesVigentesService';
import PdfPreviewDialog from '@/app/components/pdf/PdfPreviewDialog';
import styles from './AdmisionesVigentesPdfPreviewModal.module.css';

export type SectorPdfOpt = { clave: string; titulo: string };

type Props = {
	isOpen: boolean;
	onClose: () => void;
	rows: AdmisionVigente[];
	sectores: SectorPdfOpt[];
	/** Sector del filtro de la tabla; vacío = preseleccionar todos. */
	sectorInicial?: string;
	busqueda?: string;
};

function normalizar(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

export default function AdmisionesVigentesPdfPreviewModal({
	isOpen,
	onClose,
	rows,
	sectores,
	sectorInicial = '',
	busqueda = '',
}: Props) {
	const [elegidos, setElegidos] = useState<Set<string>>(new Set());
	const [listo, setListo] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [fileName, setFileName] = useState('admisiones_vigentes.pdf');

	const rowsPorBusqueda = useMemo(() => {
		const q = normalizar(busqueda.trim());
		if (!q) return rows;
		return rows.filter((f) =>
			normalizar(
				`${f.paciente} ${f.documento || ''} ${f.cama || ''} ${f.medico || ''} ${f.numeroVisita}`,
			).includes(q),
		);
	}, [rows, busqueda]);

	const conteo = useMemo(() => {
		const m = new Map<string, number>();
		for (const r of rowsPorBusqueda) {
			const k = r.sector || '—';
			m.set(k, (m.get(k) || 0) + 1);
		}
		return m;
	}, [rowsPorBusqueda]);

	useEffect(() => {
		if (!isOpen) {
			setListo(false);
			setPreviewUrl((prev) => {
				if (prev) URL.revokeObjectURL(prev);
				return null;
			});
			setError('');
			setBusy(false);
			return;
		}
		const iniciales = sectorInicial
			? new Set([sectorInicial])
			: new Set(sectores.map((s) => s.clave));
		setElegidos(iniciales);
		setListo(true);
		// Al abrir: toma el filtro de la tabla. Después el usuario cambia chips sin resetear.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen || !listo) return;

		let cancel = false;
		let objectUrl: string | null = null;

		const run = async () => {
			const seleccion = rowsPorBusqueda.filter((r) => elegidos.has(r.sector || '—'));
			if (!elegidos.size) {
				setPreviewUrl((prev) => {
					if (prev) URL.revokeObjectURL(prev);
					return null;
				});
				setError('Elegí al menos un sector para exportar.');
				setBusy(false);
				return;
			}
			if (!seleccion.length) {
				setPreviewUrl((prev) => {
					if (prev) URL.revokeObjectURL(prev);
					return null;
				});
				setError('No hay admisiones vigentes en los sectores elegidos.');
				setBusy(false);
				return;
			}

			setBusy(true);
			setError('');
			setPreviewUrl((prev) => {
				if (prev) URL.revokeObjectURL(prev);
				return null;
			});
			try {
				const nombres = sectores
					.filter((s) => elegidos.has(s.clave))
					.map((s) => s.titulo);
				const filtroDescripcion = [
					elegidos.size === sectores.length ? 'Todos los sectores' : nombres.join(', '),
					busqueda.trim() ? `"${busqueda.trim()}"` : '',
				]
					.filter(Boolean)
					.join(' · ');

				const { buildAdmisionesVigentesPdf } = await import('@/app/utils/pdfAdmisionesVigentes');
				const built = await buildAdmisionesVigentesPdf({
					rows: seleccion,
					filtroDescripcion,
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
	}, [isOpen, listo, elegidos, rowsPorBusqueda, sectores, busqueda]);

	const toggle = (clave: string) => {
		setElegidos((prev) => {
			const next = new Set(prev);
			if (next.has(clave)) next.delete(clave);
			else next.add(clave);
			return next;
		});
	};

	const todos = () => setElegidos(new Set(sectores.map((s) => s.clave)));
	const ninguno = () => setElegidos(new Set());

	const nPacientes = rowsPorBusqueda.filter((r) => elegidos.has(r.sector || '—')).length;

	return (
		<PdfPreviewDialog
			open={isOpen}
			onClose={onClose}
			title="Admisiones vigentes"
			busy={busy}
			error={error}
			url={previewUrl}
			fileName={fileName}
		>
			<div className={styles.barra}>
				<div className={styles.barraTop}>
					<span className={styles.leyenda}>Sectores a exportar</span>
					<div className={styles.atajos}>
						<button type="button" className={styles.linkBtn} onClick={todos}>
							Todos
						</button>
						<button type="button" className={styles.linkBtn} onClick={ninguno}>
							Ninguno
						</button>
					</div>
					<span className={styles.meta}>
						{nPacientes} paciente{nPacientes === 1 ? '' : 's'}
					</span>
				</div>
				<div className={styles.chips}>
					{sectores.map((s) => {
						const on = elegidos.has(s.clave);
						const n = conteo.get(s.clave) || 0;
						return (
							<label key={s.clave} className={`${styles.chip} ${on ? styles.chipOn : ''}`}>
								<input
									type="checkbox"
									checked={on}
									onChange={() => toggle(s.clave)}
								/>
								<span>
									{s.titulo}
									<small> {n}</small>
								</span>
							</label>
						);
					})}
				</div>
			</div>
		</PdfPreviewDialog>
	);
}
