import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import styles from './PhotoUploader.module.css';
import Loader from '../../Loader/Loader';

interface FotoUploaderProps {
	onPhotoChange: (file: File | null) => void;
	initialPreview?: string | null;
	setPhotoUploading: (isUploading: boolean) => void;
	title?: string;
	/** Versión chica para headers de modal (personal / paciente). */
	compact?: boolean;
}

export const PhotoUploader: React.FC<FotoUploaderProps> = ({
	onPhotoChange,
	initialPreview = null,
	setPhotoUploading,
	title = 'Foto del paciente',
	compact = false,
}) => {
	const [preview, setPreview] = useState<string | null>(initialPreview);
	const [loading, setLoading] = useState<boolean>(false);

	useEffect(() => {
		setPreview(initialPreview);
	}, [initialPreview]);

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			if (!acceptedFiles?.length) return;
			setLoading(true);
			setPhotoUploading(true);
			onPhotoChange(acceptedFiles[0]);
			setLoading(false);
			setPhotoUploading(false);
		},
		[onPhotoChange, setPhotoUploading],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
		multiple: false,
	});

	const handleRemovePhoto = (e: React.MouseEvent | React.KeyboardEvent) => {
		e.stopPropagation();
		e.preventDefault();
		setPreview(null);
		onPhotoChange(null);
	};

	return (
		<div
			{...getRootProps()}
			className={`${styles.uploaderStyle} ${compact ? styles.uploaderCompact : ''}`}
			style={{ borderColor: isDragActive ? '#007bff' : '#bbb' }}
			title={title}
		>
			<input {...getInputProps()} />
			{loading ? (
				<div
					style={{
						position: 'relative',
						minHeight: compact ? '72px' : '150px',
						width: '100%',
					}}
				>
					<Loader />
				</div>
			) : preview ? (
				<>
					<img
						src={preview}
						alt='Vista previa'
						className={`${styles.previewImg} ${compact ? styles.previewImgCompact : ''}`}
					/>
					<span
						role='button'
						tabIndex={0}
						onClick={handleRemovePhoto}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') handleRemovePhoto(e);
						}}
						className={`${styles.removeBtn} ${compact ? styles.removeBtnCompact : ''}`}
						aria-label='Eliminar foto'
					>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							viewBox='0 0 20 20'
							fill='currentColor'
						>
							<path d='M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z' />
						</svg>
					</span>
				</>
			) : (
				<div className={styles.placeholderContainer}>
					<div
						className={`${styles.iconContainer} ${compact ? styles.iconContainerCompact : ''}`}
					>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							viewBox='0 0 24 24'
							fill='currentColor'
						>
							<path d='M12 2.5a5.5 5.5 0 0 1 5.5 5.5c0 1.57-.67 3-1.69 3.98-2.34 2.26-3.81 4.73-3.81 7.02h-1c0-2.29-1.47-4.76-3.81-7.02C6.17 11 5.5 9.57 5.5 8A5.5 5.5 0 0 1 12 2.5ZM12 1C5.93 1 1 5.93 1 12s4.93 11 11 11 11-4.93 11-11S18.07 1 12 1Z' />
						</svg>
					</div>
					<p
						className={`${styles.placeholderText} ${compact ? styles.placeholderTextCompact : ''}`}
					>
						{compact ? 'Subir foto' : 'Arrastra o haz clic para subir una foto'}
					</p>
				</div>
			)}
		</div>
	);
};
