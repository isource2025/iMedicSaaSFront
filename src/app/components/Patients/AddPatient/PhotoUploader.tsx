import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import styles from './photo.module.css';

interface FotoUploaderProps {
	onPhotoChange: (file: string | null) => void;
	initialPreview?: string | null;
	setPhotoUploading: (isUploading: boolean) => void;
}

export const PhotoUploader: React.FC<FotoUploaderProps> = ({
	onPhotoChange,
	initialPreview = null,
	setPhotoUploading,
}) => {
	const [preview, setPreview] = useState<string | null>(initialPreview);
	const [loading, setLoading] = useState<boolean>(false);

	useEffect(() => {
		setPreview(initialPreview);
	}, [initialPreview]);

	useEffect(() => {
		if (preview) {
			return () => {
				URL.revokeObjectURL(preview);
			};
		}
	}, [preview]);

	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			if (!acceptedFiles?.length) return;
			setLoading(true);
			setPhotoUploading(true);

			const file = acceptedFiles[0];

			// NO seteamos preview local (blob). Mostramos spinner hasta terminar.
			const formData = new FormData();
			formData.append('file', file);
			formData.append('upload_preset', 'testMedic'); // tu preset
			formData.append('cloud_name', 'dsvghulau'); // tu cloud_name

			try {
				const res = await fetch(
					`https://api.cloudinary.com/v1_1/dsvghulau/image/upload`,
					{
						method: 'POST',
						body: formData,
					},
				);
				const data = await res.json();

				if (data.secure_url) {
					console.log('Imagen subida:', data.secure_url);
					setPreview(data.secure_url);
					onPhotoChange(data.secure_url);
				} else {
					onPhotoChange(null);
				}
			} catch (err) {
				console.error('Error subiendo imagen:', err);
				onPhotoChange(null);
			} finally {
				setLoading(false);
				setPhotoUploading(false);
			}
		},
		[onPhotoChange],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
		multiple: false,
	});

	const handleRemovePhoto = (e: React.MouseEvent) => {
		e.stopPropagation();
		setPreview(null);
		onPhotoChange(null);
	};

	return (
		<div
			{...getRootProps()}
			className={styles.uploaderStyle}
			style={{ borderColor: isDragActive ? '#007bff' : '#bbb' }}
			title='Foto del paciente'
		>
			<input {...getInputProps()} />
			{loading ? (
				<div className={styles.loadingContainer}>
					<div className={styles.spinner}></div>
					<p>Cargando foto...</p>
				</div>
			) : preview ? (
				<>
					<img src={preview} alt='Vista previa' className={styles.previewImg} />
					<button
						onClick={handleRemovePhoto}
						className={styles.removeBtn}
						aria-label='Eliminar foto'
					>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							viewBox='0 0 20 20'
							fill='currentColor'
						>
							<path d='M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z' />
						</svg>
					</button>
				</>
			) : (
				<div className={styles.placeholderContainer}>
					<div className={styles.iconContainer}>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							viewBox='0 0 24 24'
							fill='currentColor'
						>
							<path d='M12 2.5a5.5 5.5 0 0 1 5.5 5.5c0 1.57-.67 3-1.69 3.98-2.34 2.26-3.81 4.73-3.81 7.02h-1c0-2.29-1.47-4.76-3.81-7.02C6.17 11 5.5 9.57 5.5 8A5.5 5.5 0 0 1 12 2.5ZM12 1C5.93 1 1 5.93 1 12s4.93 11 11 11 11-4.93 11-11S18.07 1 12 1Z' />
						</svg>
					</div>
					<p className={styles.placeholderText}>
						Arrastra o haz clic para subir una foto
					</p>
				</div>
			)}
		</div>
	);
};
