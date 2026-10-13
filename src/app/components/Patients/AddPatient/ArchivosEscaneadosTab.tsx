'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye } from 'lucide-react';
import AdjuntoFileViewer, {
	type AdjuntoViewerState,
} from '@/app/components/beds/adjuntos/AdjuntoFileViewer';
import admisionNuevaService from '@/app/services/admisionNuevaService';
import type { DocumentoPaciente } from '@/app/types/admisionNueva';
import styles from './ArchivosEscaneadosTab.module.css';

interface Props {
	idPaciente?: number | string;
}

function fechaCorta(iso: string | null): string {
	if (!iso) return '';
	const [y, m, d] = iso.split('-');
	return y && m && d ? `${d}/${m}/${y}` : iso;
}

export default function ArchivosEscaneadosTab({ idPaciente }: Props) {
	const id = Number(idPaciente) || 0;
	const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([]);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState('');
	const [viewer, setViewer] = useState<AdjuntoViewerState | null>(null);
	const [abriendo, setAbriendo] = useState(false);

	useEffect(() => {
		if (!id) return;
		let cancelado = false;
		setCargando(true);
		setError('');
		admisionNuevaService
			.getDocumentosPaciente(id)
			.then((docs) => {
				if (!cancelado) setDocumentos(docs);
			})
			.catch(() => {
				if (!cancelado) setError('No se pudieron obtener los archivos escaneados.');
			})
			.finally(() => {
				if (!cancelado) setCargando(false);
			});
		return () => {
			cancelado = true;
		};
	}, [id]);

	useEffect(
		() => () => {
			if (viewer?.blobUrl) URL.revokeObjectURL(viewer.blobUrl);
		},
		[viewer?.blobUrl],
	);

	const ver = async (doc: DocumentoPaciente) => {
		setError('');
		setAbriendo(true);
		try {
			const { blob, blobUrl } = await admisionNuevaService.getArchivoDocumentoPaciente(id, doc);
			setViewer({ blobUrl, fileName: doc.nombreArchivo || doc.descripcion, mimeType: blob.type });
		} catch {
			setError(`Error al obtener el documento "${doc.descripcion}".`);
		} finally {
			setAbriendo(false);
		}
	};

	if (!id) {
		return (
			<div className={styles.contenedor}>
				<p className={styles.ayuda}>Guardá el paciente para ver sus archivos escaneados.</p>
			</div>
		);
	}

	return (
		<div className={styles.contenedor}>
			{error && <p className={styles.error}>{error}</p>}

			{cargando ? (
				<p className={styles.ayuda}>Cargando archivos escaneados…</p>
			) : documentos.length === 0 ? (
				<p className={styles.ayuda}>El paciente no tiene archivos escaneados.</p>
			) : (
				<ul className={styles.lista}>
					{documentos.map((doc) => (
						<li key={`${doc.numeroVisita}-${doc.valor}`} className={styles.fila}>
							<div className={styles.info}>
								<span className={styles.nombre}>{doc.descripcion}</span>
								<span className={styles.meta} title={doc.nombreArchivo}>
									Visita {doc.numeroVisita}
									{doc.fecha ? ` · ${fechaCorta(doc.fecha)}` : ''}
									{doc.nombreArchivo ? ` · ${doc.nombreArchivo}` : ''}
								</span>
							</div>
							<button
								type='button'
								className={styles.botonVer}
								disabled={abriendo}
								onClick={() => void ver(doc)}
							>
								<Eye size={15} /> Ver
							</button>
						</li>
					))}
				</ul>
			)}

			{typeof document !== 'undefined' &&
				createPortal(
					<AdjuntoFileViewer
						viewer={viewer}
						loading={abriendo}
						onClose={() => setViewer(null)}
					/>,
					document.body,
				)}
		</div>
	);
}
