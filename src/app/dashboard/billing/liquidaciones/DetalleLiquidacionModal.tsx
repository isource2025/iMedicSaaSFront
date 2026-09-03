'use client';

import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import Loader from '@/app/components/Loader/Loader';
import Modal from '@/app/components/UI/Modal';
import { mensajeDeError } from '@/app/utils/apiError';
import {
	liquidacionImportService,
	type ImportacionDetalle,
	type ImportacionResumen,
} from '@/app/services/liquidacionImportService';
import ui from '../../profile/profile.module.css';
import styles from './liquidaciones.module.css';
import FilasLiquidacionTable from './FilasLiquidacionTable';
import {
	claseEstadoFila,
	formatFechaHora,
	formatImporte,
	type FilaTablaLiquidacion,
} from './liquidacionesShared';

export default function DetalleLiquidacionModal({
	resumen,
	isOpen,
	puedeEditar,
	onClose,
	onRevertida,
	onRenombrado,
}: {
	resumen: ImportacionResumen | null;
	isOpen: boolean;
	puedeEditar: boolean;
	onClose: () => void;
	onRevertida: () => void;
	onRenombrado: (archivo: string) => void;
}) {
	const [detalle, setDetalle] = useState<ImportacionDetalle | null>(null);
	const [cargando, setCargando] = useState(false);
	const [revirtiendo, setRevirtiendo] = useState(false);
	const [guardandoNombre, setGuardandoNombre] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [nombreArchivo, setNombreArchivo] = useState('');

	const id = resumen?.IdImport;
	const cab = detalle || resumen;
	const aplicada = cab?.Estado === 'APLICADO';
	const nombreGuardado = cab?.Archivo || '';
	const nombreSucio = nombreArchivo.trim() !== '' && nombreArchivo.trim() !== nombreGuardado;

	useEffect(() => {
		setNombreArchivo(resumen?.Archivo || '');
	}, [resumen?.Archivo, isOpen]);

	useEffect(() => {
		if (detalle?.Archivo) setNombreArchivo(detalle.Archivo);
	}, [detalle?.Archivo]);

	useEffect(() => {
		if (!isOpen || !id) {
			setDetalle(null);
			setError(null);
			return;
		}
		let cancelado = false;
		setCargando(true);
		setError(null);
		void liquidacionImportService
			.obtenerImportacion(id)
			.then((data) => {
				if (!cancelado) setDetalle(data);
			})
			.catch((e) => {
				if (!cancelado) setError(mensajeDeError(e, 'No pude cargar el detalle'));
			})
			.finally(() => {
				if (!cancelado) setCargando(false);
			});
		return () => {
			cancelado = true;
		};
	}, [isOpen, id]);

	const filas: FilaTablaLiquidacion[] = useMemo(
		() =>
			(detalle?.detalle || []).map((f, i) => ({
				key: `${f.FilaExcel ?? i}-${f.IdPrestacion ?? 'sin'}`,
				profesional: f.profesional ?? null,
				matricula: f.Matricula,
				numeroVisita: f.NumeroVisita,
				codigo: null,
				idPrestacion: f.IdPrestacion,
				importeFinal: null,
				importeAnterior: f.ImporteAnterior,
				importeNuevo: f.ImporteNuevo ?? f.ImporteExcel,
				estado: f.Estado,
			})),
		[detalle],
	);

	const revertir = async () => {
		if (!id) return;
		setRevirtiendo(true);
		setError(null);
		try {
			await liquidacionImportService.revertir(id);
			onRevertida();
		} catch (e) {
			setError(mensajeDeError(e, 'No pude revertir la importación'));
		} finally {
			setRevirtiendo(false);
		}
	};

	const guardarNombre = async () => {
		if (!id || !nombreSucio) return;
		setGuardandoNombre(true);
		setError(null);
		try {
			const data = await liquidacionImportService.renombrar(id, nombreArchivo.trim());
			const archivo = data.Archivo;
			setNombreArchivo(archivo);
			setDetalle((prev) => (prev ? { ...prev, Archivo: archivo } : prev));
			onRenombrado(archivo);
		} catch (e) {
			setError(mensajeDeError(e, 'No pude guardar el nombre'));
		} finally {
			setGuardandoNombre(false);
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={cab ? `Liquidación #${cab.IdImport}` : 'Detalle'}
			size="xlarge"
			priority="high"
		>
			<div className={styles.modalBody}>
				{error && <p className={ui.err}>{error}</p>}
				{(cargando || revirtiendo) && (
					<div className={ui.loaderWrap}>
						<Loader />
					</div>
				)}
				{cab && !cargando && !revirtiendo && (
					<>
						<div className={styles.detalleMeta}>
							<div className={styles.archivoMeta}>
								<div className={ui.fieldLabel}>Archivo</div>
								{puedeEditar ? (
									<div className={styles.archivoEdit}>
										<input
											type="text"
											className={`${ui.dateInput} ${styles.archivoFieldInput}`}
											value={nombreArchivo}
											maxLength={260}
											onChange={(e) => setNombreArchivo(e.target.value)}
										/>
										<button
											type="button"
											className={ui.btnGhost}
											disabled={!nombreSucio || guardandoNombre}
											onClick={() => void guardarNombre()}
										>
											Guardar
										</button>
									</div>
								) : (
									<div className={ui.fieldValue}>{cab.Archivo}</div>
								)}
							</div>
							<div>
								<div className={ui.fieldLabel}>Fecha</div>
								<div className={ui.fieldValue}>{formatFechaHora(cab.FechaHora)}</div>
							</div>
							<div>
								<div className={ui.fieldLabel}>Usuario</div>
								<div className={ui.fieldValue}>{cab.Usuario || '—'}</div>
							</div>
							<div>
								<div className={ui.fieldLabel}>Importe</div>
								<div className={ui.fieldValue}>${formatImporte(cab.ImporteAplicado)}</div>
							</div>
							<div>
								<div className={ui.fieldLabel}>Estado</div>
								<span className={claseEstadoFila(cab.Estado)}>
									{aplicada ? 'Aplicada' : 'Revertida'}
								</span>
							</div>
						</div>
						{puedeEditar && aplicada && (
							<div className={styles.modalToolbar}>
								<button type="button" className={ui.btnGhost} onClick={() => void revertir()}>
									<RotateCcw size={14} /> Revertir importación
								</button>
							</div>
						)}
						<FilasLiquidacionTable filas={filas} />
					</>
				)}
			</div>
		</Modal>
	);
}
