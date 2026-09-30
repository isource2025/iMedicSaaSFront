'use client';

import { useState } from 'react';
import type { TipoImagenHC } from '@/app/types/adjuntos';
import SubirAdjuntoModal from '@/app/components/beds/adjuntos/SubirAdjuntoModal';
import SubirAdjuntoButton from '@/app/components/beds/adjuntos/SubirAdjuntoButton';
import styles from './PedidoEstudioForms.module.css';

type Props = {
	tipos: TipoImagenHC[];
	tipoImagen: string;
	onTipoChange: (value: string) => void;
	archivos: File[];
	onArchivosChange: (files: File[]) => void;
	disabled?: boolean;
	idVisita?: number;
};

const MAX_FILES = 8;

function formatSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PedidoAdjuntosField({
	tipos,
	tipoImagen,
	onTipoChange,
	archivos,
	onArchivosChange,
	disabled,
	idVisita,
}: Props) {
	const [modalOpen, setModalOpen] = useState(false);
	const restantes = MAX_FILES - archivos.length;
	const tipoDesc = tipos.find((t) => t.TipoImagen === tipoImagen)?.DescTipoImagen || tipoImagen;

	const agregar = (files: File[], tipo: string) => {
		const next = [...archivos];
		for (const file of files) {
			if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
			if (next.length >= MAX_FILES) break;
			next.push(file);
		}
		onTipoChange(tipo);
		onArchivosChange(next);
	};

	const removeFile = (index: number) => {
		onArchivosChange(archivos.filter((_, i) => i !== index));
	};

	return (
		<section className={styles.adjuntosSection}>
			<div className={styles.adjuntosHead}>
				<div>
					<h4 className={styles.adjuntosTitle}>Adjuntos del informe</h4>
					<p className={styles.adjuntosHint}>
						Opcional. Quedan en la historia clínica
						{idVisita ? ` de la visita ${idVisita}` : ''}.
						{archivos.length > 0 && tipoDesc ? ` Tipo: ${tipoDesc}.` : ''}
					</p>
				</div>
				<SubirAdjuntoButton
					onClick={() => setModalOpen(true)}
					disabled={disabled || restantes <= 0}
				/>
			</div>

			{archivos.length > 0 ? (
				<ul className={styles.fileChips}>
					{archivos.map((file, index) => (
						<li key={`${file.name}-${file.size}-${index}`} className={styles.fileChip}>
							<span className={styles.fileChipIcon} aria-hidden>
								{file.type.startsWith('image/') ? '🖼' : file.type.startsWith('video/') ? '🎞' : '📄'}
							</span>
							<span className={styles.fileChipBody}>
								<span className={styles.fileChipName}>{file.name}</span>
								<span className={styles.fileChipSize}>{formatSize(file.size)}</span>
							</span>
							<button
								type="button"
								className={styles.fileChipRemove}
								onClick={() => removeFile(index)}
								disabled={disabled}
								aria-label={`Quitar ${file.name}`}
							>
								×
							</button>
						</li>
					))}
				</ul>
			) : null}

			<SubirAdjuntoModal
				isOpen={modalOpen}
				onClose={() => setModalOpen(false)}
				titleMeta={idVisita ? `Visita #${idVisita}` : undefined}
				tiposImagen={tipos}
				tipoInicial={tipoImagen}
				maxFiles={Math.max(restantes, 1)}
				confirmLabel={(n) => `Agregar ${n} archivo(s)`}
				onConfirm={agregar}
			/>
		</section>
	);
}

export function sugerirTipoImagen(tipos: TipoImagenHC[], practica: string): string {
	const haystack = practica.toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÑ ]/g, ' ');
	let best = '';
	let bestScore = 0;
	for (const t of tipos) {
		const desc = (t.DescTipoImagen || t.TipoImagen || '').toUpperCase().trim();
		if (!desc) continue;
		let score = 0;
		if (haystack.includes(desc)) score = desc.length;
		else {
			const tokens = desc.split(/\s+/).filter((w) => w.length >= 4);
			for (const tok of tokens) {
				if (haystack.includes(tok)) score = Math.max(score, tok.length);
			}
		}
		if (score > bestScore) {
			bestScore = score;
			best = t.TipoImagen;
		}
	}
	return bestScore >= 4 ? best : '';
}
