'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Receipt, RefreshCw } from 'lucide-react';
import Loader from '@/app/components/Loader/Loader';
import Modal from '@/app/components/UI/Modal';
import { mensajeDeError } from '@/app/utils/apiError';
import {
	liquidacionImportService,
	type PreviewLiquidacion,
} from '@/app/services/liquidacionImportService';
import ui from '../../profile/profile.module.css';
import styles from './liquidaciones.module.css';
import FilasLiquidacionTable from './FilasLiquidacionTable';
import { filaDesdePreview, formatImporte } from './liquidacionesShared';

export default function ImportarLiquidacionModal({
	file,
	isOpen,
	onClose,
	onAplicado,
}: {
	file: File | null;
	isOpen: boolean;
	onClose: () => void;
	onAplicado: (idImport: number, archivo: string) => void;
}) {
	const [preview, setPreview] = useState<PreviewLiquidacion | null>(null);
	const [cargando, setCargando] = useState(false);
	const [aplicando, setAplicando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmarParcial, setConfirmarParcial] = useState(false);
	const [nombreArchivo, setNombreArchivo] = useState('');

	useEffect(() => {
		setNombreArchivo(file?.name || '');
	}, [file]);

	useEffect(() => {
		if (!isOpen || !file) {
			setPreview(null);
			setError(null);
			setConfirmarParcial(false);
			return;
		}
		let cancelado = false;
		setCargando(true);
		setError(null);
		void liquidacionImportService
			.previsualizar(file)
			.then((data) => {
				if (!cancelado) setPreview(data);
			})
			.catch((e) => {
				if (!cancelado) setError(mensajeDeError(e, 'No pude leer el archivo'));
			})
			.finally(() => {
				if (!cancelado) setCargando(false);
			});
		return () => {
			cancelado = true;
		};
	}, [isOpen, file]);

	const filas = useMemo(() => (preview ? preview.filas.map(filaDesdePreview) : []), [preview]);

	const nombreVisible = nombreArchivo.trim() || file?.name || 'liquidacion.xlsx';

	const aplicar = async () => {
		if (!file || !preview) return;
		setAplicando(true);
		setError(null);
		try {
			const resultado = await liquidacionImportService.aplicar(file, {
				confirmarParcial,
				nombreArchivo: nombreVisible,
			});
			const id = resultado.aplicado?.idImport;
			if (id) onAplicado(id, nombreVisible);
			else onClose();
		} catch (e) {
			setError(mensajeDeError(e, 'No pude aplicar la liquidación'));
		} finally {
			setAplicando(false);
		}
	};

	const aplicado = preview?.aplicado;
	const puedeAplicar =
		!!preview &&
		!aplicado &&
		preview.resumen.aplicables > 0 &&
		(preview.resumen.rechazadas === 0 || confirmarParcial);

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={file ? `Importar · ${nombreVisible}` : 'Importar liquidación'}
			size="xlarge"
			priority="high"
		>
			<div className={styles.modalBody}>
				{error && <p className={ui.err}>{error}</p>}
				{file && (
					<label className={styles.archivoField}>
						<span className={ui.fieldLabel}>Nombre del archivo</span>
						<input
							type="text"
							className={`${ui.dateInput} ${styles.archivoFieldInput}`}
							value={nombreArchivo}
							maxLength={260}
							onChange={(e) => setNombreArchivo(e.target.value)}
						/>
					</label>
				)}
				{(cargando || aplicando) && (
					<div className={ui.loaderWrap}>
						<Loader />
					</div>
				)}
				{preview && !cargando && !aplicando && (
					<>
						<div className={ui.statsRow}>
							<div className={`${ui.statCard} ${ui.statCardPrimary}`}>
								<div className={ui.statIcon}>
									<Receipt size={18} />
								</div>
								<div className={ui.statBody}>
									<div className={ui.statLabel}>Importe a aplicar</div>
									<div className={`${ui.statValue} ${ui.statValueLarge}`}>
										${formatImporte(preview.resumen.importeAplicable)}
									</div>
									<div className={ui.statHint}>Hoja {preview.hoja}</div>
								</div>
							</div>
							<div className={ui.statCard}>
								<div className={ui.statIcon}>
									<CheckCircle2 size={18} />
								</div>
								<div className={ui.statBody}>
									<div className={ui.statLabel}>Coinciden</div>
									<div className={ui.statValue}>{preview.resumen.aplicables}</div>
									<div className={ui.statHint}>se van a escribir en facturación</div>
								</div>
							</div>
							<div
								className={`${ui.statCard} ${
									preview.resumen.rechazadas > 0 ? ui.statCardDanger : ''
								}`}
							>
								<div className={ui.statIcon}>
									<ClipboardList size={18} />
								</div>
								<div className={ui.statBody}>
									<div className={ui.statLabel}>Sin aplicar</div>
									<div className={ui.statValue}>{preview.resumen.rechazadas}</div>
									<div className={ui.statHint}>{preview.resumen.filas} renglones en el archivo</div>
								</div>
							</div>
						</div>

						<div className={styles.modalToolbar}>
							{preview.resumen.rechazadas > 0 && (
								<label className={styles.checkbox}>
									<input
										type="checkbox"
										checked={confirmarParcial}
										onChange={(e) => setConfirmarParcial(e.target.checked)}
									/>
									<span>
										Aplicar solo los {preview.resumen.aplicables} que coinciden
									</span>
								</label>
							)}
							<button type="button" className={ui.btnGhost} onClick={onClose}>
								Cancelar
							</button>
							<button
								type="button"
								className={ui.btnApply}
								disabled={!puedeAplicar}
								onClick={() => void aplicar()}
							>
								<RefreshCw size={13} /> Aplicar a la facturación
							</button>
						</div>

						<FilasLiquidacionTable filas={filas} />
					</>
				)}
			</div>
		</Modal>
	);
}
