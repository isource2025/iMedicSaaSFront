'use client';

import { useCallback, useEffect, useState } from 'react';
import { agendaService } from '@/app/services/agendaService';
import { adjuntosService } from '@/app/services/adjuntosService';
import AdjuntoFileViewer, {
	type AdjuntoViewerState,
} from '@/app/components/beds/adjuntos/AdjuntoFileViewer';
import SubirAdjuntoModal from '@/app/components/beds/adjuntos/SubirAdjuntoModal';
import SubirAdjuntoButton from '@/app/components/beds/adjuntos/SubirAdjuntoButton';
import type { Adjunto, TipoImagenHC } from '@/app/types/adjuntos';
import Loader from '../Loader/Loader';
import styles from './AgendaAdjuntosTab.module.css';

interface Props {
	idTurno: number;
	onUploadingChange?: (uploading: boolean) => void;
}

export default function AgendaAdjuntosTab({ idTurno, onUploadingChange }: Props) {
	const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
	const [tipos, setTipos] = useState<TipoImagenHC[]>([]);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [subirOpen, setSubirOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [viewer, setViewer] = useState<AdjuntoViewerState | null>(null);
	const [viewerLoading, setViewerLoading] = useState(false);

	useEffect(() => {
		onUploadingChange?.(uploading);
	}, [uploading, onUploadingChange]);

	const cargar = useCallback(async (silencioso = false) => {
		if (!silencioso) setLoading(true);
		setError(null);
		try {
			const [list, tiposImg] = await Promise.all([
				agendaService.getAdjuntosTurno(idTurno),
				adjuntosService.getTiposImagenes(),
			]);
			setAdjuntos(list);
			setTipos(tiposImg);
		} catch (e: unknown) {
			const err = e as { message?: string };
			setError(err?.message || 'Error al cargar adjuntos');
		} finally {
			setLoading(false);
		}
	}, [idTurno]);

	useEffect(() => {
		void cargar();
	}, [cargar]);

	useEffect(() => {
		return () => adjuntosService.revocarBlobUrl(viewer?.blobUrl);
	}, [viewer?.blobUrl]);

	const subirArchivos = async (files: File[], tipoImagen: string) => {
		setUploading(true);
		setError(null);
		try {
			for (const file of files) {
				await agendaService.subirAdjuntoTurno(idTurno, file, tipoImagen);
			}
		} finally {
			setUploading(false);
			await cargar(true);
		}
	};

	const abrirAdjunto = async (adjunto: Adjunto) => {
		if (viewerLoading) return;
		setViewerLoading(true);
		try {
			const { blob, blobUrl } = await adjuntosService.cargarBlobAdjunto(adjunto.IdAdjunto);
			adjuntosService.revocarBlobUrl(viewer?.blobUrl);
			setViewer({
				blobUrl,
				fileName: adjunto.NombreArchivo,
				mimeType: blob.type || adjunto.TipoArchivo || '',
			});
		} catch (err: unknown) {
			const ex = err as { message?: string };
			setError(ex?.message || 'No se pudo abrir el archivo');
		} finally {
			setViewerLoading(false);
		}
	};

	const closeViewer = () => {
		adjuntosService.revocarBlobUrl(viewer?.blobUrl);
		setViewer(null);
	};

	if (loading) return <Loader />;

	return (
		<div className={styles.wrap}>
			<p className={styles.hint}>
				Podés adjuntar pedidos médicos y documentos antes de cerrar el turno. Al cerrar se
				vinculan a la visita.
			</p>

			<div className={styles.uploadRow}>
				<SubirAdjuntoButton
					onClick={() => setSubirOpen(true)}
					disabled={uploading}
					label={uploading ? 'Subiendo…' : '+ Subir nuevo'}
				/>
			</div>

			<SubirAdjuntoModal
				isOpen={subirOpen}
				onClose={() => setSubirOpen(false)}
				titleMeta={`Turno #${idTurno}`}
				tiposImagen={tipos}
				onConfirm={subirArchivos}
			/>

			{error ? <div className={styles.error}>{error}</div> : null}

			{adjuntos.length === 0 ? (
				<p className={styles.empty}>Sin adjuntos cargados.</p>
			) : (
				<ul className={styles.list}>
					{adjuntos.map((a) => (
						<li key={a.IdAdjunto} className={styles.item}>
							<button
								type='button'
								className={styles.linkBtn}
								disabled={viewerLoading}
								onClick={() => void abrirAdjunto(a)}
							>
								{a.NombreArchivo}
							</button>
							<span className={styles.meta}>
								{a.TipoImagenNombre || '—'} ·{' '}
								{a.FechaCarga
									? new Date(a.FechaCarga).toLocaleString('es-AR')
									: '—'}
							</span>
						</li>
					))}
				</ul>
			)}

			<AdjuntoFileViewer
				viewer={viewer}
				loading={viewerLoading}
				onClose={closeViewer}
			/>
		</div>
	);
}
