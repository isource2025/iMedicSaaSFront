'use client';

import { useCallback, useEffect, useState } from 'react';
import { agendaService } from '@/app/services/agendaService';
import { adjuntosService } from '@/app/services/adjuntosService';
import AdjuntoFileViewer, {
	type AdjuntoViewerState,
} from '@/app/components/beds/adjuntos/AdjuntoFileViewer';
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
	const [tipoSel, setTipoSel] = useState('');
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [viewer, setViewer] = useState<AdjuntoViewerState | null>(null);
	const [viewerLoading, setViewerLoading] = useState(false);

	useEffect(() => {
		onUploadingChange?.(uploading);
	}, [uploading, onUploadingChange]);

	const cargar = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [list, tiposImg] = await Promise.all([
				agendaService.getAdjuntosTurno(idTurno),
				adjuntosService.getTiposImagenes(),
			]);
			setAdjuntos(list);
			setTipos(tiposImg);
			if (!tipoSel && tiposImg.length) {
				setTipoSel(String(tiposImg[0].TipoImagen || '').trim());
			}
		} catch (e: unknown) {
			const err = e as { message?: string };
			setError(err?.message || 'Error al cargar adjuntos');
		} finally {
			setLoading(false);
		}
	}, [idTurno, tipoSel]);

	useEffect(() => {
		void cargar();
	}, [cargar]);

	useEffect(() => {
		return () => adjuntosService.revocarBlobUrl(viewer?.blobUrl);
	}, [viewer?.blobUrl]);

	const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (!file || !tipoSel.trim()) return;
		setUploading(true);
		setError(null);
		try {
			await agendaService.subirAdjuntoTurno(idTurno, file, tipoSel.trim());
			await cargar();
		} catch (err: unknown) {
			const ex = err as { message?: string };
			setError(ex?.message || 'Error al subir archivo');
		} finally {
			setUploading(false);
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
				<label className={styles.field}>
					Tipo de documento
					<select value={tipoSel} onChange={(e) => setTipoSel(e.target.value)}>
						{tipos.map((t) => (
							<option key={t.TipoImagen} value={t.TipoImagen}>
								{t.DescTipoImagen || t.TipoImagen}
							</option>
						))}
					</select>
				</label>
				<label className={styles.fileBtn}>
					{uploading ? 'Subiendo…' : 'Seleccionar archivo'}
					<input
						type='file'
						accept='.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.dcm'
						disabled={uploading || !tipoSel}
						onChange={onFile}
					/>
				</label>
			</div>

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
