'use client';

import { useRef, useState } from 'react';
import type { TipoImagenHC } from '@/app/types/adjuntos';
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

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.gif,.dcm,.doc,.docx';
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 8;

function formatSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAllowed(file: File) {
	const typeOk = [
		'application/pdf',
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/gif',
		'application/dicom',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	].includes(file.type);
	const dicom = /\.dcm$/i.test(file.name);
	return typeOk || dicom;
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
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragActive, setDragActive] = useState(false);
	const [hintError, setHintError] = useState<string | null>(null);

	const addFiles = (incoming: FileList | File[]) => {
		const errors: string[] = [];
		const next = [...archivos];
		for (const file of Array.from(incoming)) {
			if (!isAllowed(file)) {
				errors.push(`${file.name}: tipo no permitido`);
				continue;
			}
			if (file.size > MAX_SIZE) {
				errors.push(`${file.name}: supera 10 MB`);
				continue;
			}
			if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
			if (next.length >= MAX_FILES) {
				errors.push(`Máximo ${MAX_FILES} archivos`);
				break;
			}
			next.push(file);
		}
		setHintError(errors[0] || null);
		onArchivosChange(next);
	};

	const removeFile = (index: number) => {
		onArchivosChange(archivos.filter((_, i) => i !== index));
		if (inputRef.current) inputRef.current.value = '';
	};

	return (
		<section className={styles.adjuntosSection}>
			<div className={styles.adjuntosHead}>
				<div>
					<h4 className={styles.adjuntosTitle}>Adjuntos del informe</h4>
					<p className={styles.adjuntosHint}>
						Opcional. Quedan en la historia clínica
						{idVisita ? ` de la visita ${idVisita}` : ''}.
					</p>
				</div>
			</div>

			<label className={styles.adjuntosTipo}>
				<span>Tipo de documento</span>
				<select
					className={styles.input}
					value={tipoImagen}
					onChange={(e) => onTipoChange(e.target.value)}
					disabled={disabled}
				>
					<option value="">Seleccionar…</option>
					{tipos.map((t) => (
						<option key={t.TipoImagen} value={t.TipoImagen}>
							{t.DescTipoImagen || t.TipoImagen}
						</option>
					))}
				</select>
			</label>

			<div
				className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''} ${
					disabled ? styles.dropzoneDisabled : ''
				}`}
				onDragEnter={(e) => {
					e.preventDefault();
					e.stopPropagation();
					if (!disabled) setDragActive(true);
				}}
				onDragOver={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
				onDragLeave={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setDragActive(false);
				}}
				onDrop={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setDragActive(false);
					if (!disabled) addFiles(e.dataTransfer.files);
				}}
				onClick={() => {
					if (!disabled) inputRef.current?.click();
				}}
				role="button"
				tabIndex={disabled ? -1 : 0}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						if (!disabled) inputRef.current?.click();
					}
				}}
			>
				<input
					ref={inputRef}
					type="file"
					multiple
					accept={ACCEPT}
					disabled={disabled}
					className={styles.fileInputHidden}
					onChange={(e) => {
						if (e.target.files) addFiles(e.target.files);
					}}
				/>
				<span className={styles.dropzoneIcon} aria-hidden>
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="17 8 12 3 7 8" />
						<line x1="12" y1="3" x2="12" y2="15" />
					</svg>
				</span>
				<p className={styles.dropzoneText}>Arrastrá archivos o hacé clic para elegirlos</p>
				<p className={styles.dropzoneMeta}>PDF, imagen, DICOM o Word · máx. 10 MB c/u</p>
			</div>

			{hintError ? <p className={styles.adjuntosError}>{hintError}</p> : null}

			{archivos.length > 0 ? (
				<ul className={styles.fileChips}>
					{archivos.map((file, index) => (
						<li key={`${file.name}-${file.size}-${index}`} className={styles.fileChip}>
							<span className={styles.fileChipIcon} aria-hidden>
								{file.type.startsWith('image/') ? '🖼' : '📄'}
							</span>
							<span className={styles.fileChipBody}>
								<span className={styles.fileChipName}>{file.name}</span>
								<span className={styles.fileChipSize}>{formatSize(file.size)}</span>
							</span>
							<button
								type="button"
								className={styles.fileChipRemove}
								onClick={(e) => {
									e.stopPropagation();
									removeFile(index);
								}}
								disabled={disabled}
								aria-label={`Quitar ${file.name}`}
							>
								×
							</button>
						</li>
					))}
				</ul>
			) : null}
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
