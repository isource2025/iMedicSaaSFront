import { PatientFormData } from '@/src/app/types/PatientInterface';
import styles from './Header.module.css';
import { PhotoUploader } from './PhotoUploader';

interface HeaderAddPatientProps {
	formData: PatientFormData;
	handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
	errors: Record<string, string>;
	tiposDocumento: { value: string; label: string }[];
	getRenaperInfo: (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
		NumeroDocumento: number,
		Sexo: string,
	) => Promise<void>;
	buscandoRenaper: boolean;
	onPhotoChange: (url: string | null) => void;
	setPhotoUploading: (isUploading: boolean) => void;
}

export default function HeaderAddPatient({
	formData,
	handleChange,
	errors,
	tiposDocumento,
	getRenaperInfo,
	buscandoRenaper,
	onPhotoChange,
	setPhotoUploading,
}: HeaderAddPatientProps) {
	return (
		<div className={styles.headerContainer}>
			{/* Componente para subir la foto del paciente */}
			<div className={styles.headerPhoto}>
				<PhotoUploader
					onPhotoChange={onPhotoChange}
					initialPreview={formData.Foto ?? null}
					setPhotoUploading={setPhotoUploading}
				/>
			</div>
			{/* Contenedor de todos los campos con layout de grid */}
			<div className={styles.fieldsGrid}>
				{/* --- Campo Número HC --- */}
				<div className={styles.headerField}>
					<label className={styles.headerLabel}>Número HC</label>
					<input
						type='text'
						name='NumeroHC'
						value={formData.NumeroHC}
						onChange={handleChange}
						className={styles.headerInput}
					/>
					{errors.NumeroHC && (
						<div className={styles.headerError}>{errors.NumeroHC}</div>
					)}
				</div>

				{/* --- Campo Tipo Documento --- */}
				<div className={styles.headerField}>
					<label className={`${styles.headerLabel} ${styles.requiredField}`}>
						Tipo Documento
					</label>
					<select
						name='TipoDocumento'
						value={formData.TipoDocumento}
						onChange={handleChange}
						className={styles.headerSelect}
						required
					>
						{tiposDocumento.map((tipo) => (
							<option key={tipo.value} value={tipo.value}>
								{tipo.label}
							</option>
						))}
					</select>
					{errors.TipoDocumento && (
						<div className={styles.headerError}>{errors.TipoDocumento}</div>
					)}
				</div>

				{/* --- Campo Nº Documento con Botón de Búsqueda --- */}
				<div className={styles.headerField}>
					<label className={`${styles.headerLabel} ${styles.requiredField}`}>
						Nº Documento
					</label>
					<div className={styles.documentFieldContainer}>
						<input
							type='text'
							name='NumeroDocumento'
							value={formData.NumeroDocumento}
							onChange={handleChange}
							className={`${styles.headerInput} ${styles.documentInput}`} // Dos clases
							required
						/>
						{!buscandoRenaper ? (
							<button
								type='button'
								onClick={(e: any) =>
									getRenaperInfo(
										e,
										Number(formData.NumeroDocumento),
										formData.Sexo,
									)
								}
								className={styles.searchButton}
								title='Buscar en Renaper'
							>
								<svg
									viewBox='0 0 24 24'
									fill='none'
									xmlns='http://www.w3.org/2000/svg'
								>
									<path
										d='M17 17L21 21'
										stroke='currentColor'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
									<path
										d='M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z'
										stroke='currentColor'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</svg>
							</button>
						) : (
							<div className={`${styles.searchButton} ${styles.spinner}`}>
								<svg
									viewBox='0 0 24 24'
									fill='none'
									xmlns='http://www.w3.org/2000/svg'
								>
									<path
										d='M12 3V6'
										stroke='currentColor'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
									<path
										d='M12 18V21'
										stroke='currentColor'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
									<path
										d='M21 12H18'
										stroke='currentColor'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
									<path
										d='M6 12H3'
										stroke='currentColor'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
									<path
										d='M18.364 5.63604L16.2427 7.75736'
										stroke='currentColor'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
									<path
										d='M7.75736 16.2426L5.63604 18.364'
										stroke='currentColor'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
									<path
										d='M18.364 18.364L16.2427 16.2426'
										stroke='currentColor'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
									<path
										d='M7.75736 7.75736L5.63604 5.63604'
										stroke='currentColor'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</svg>
							</div>
						)}
					</div>
					{errors.NumeroDocumento && (
						<div className={styles.headerError}>{errors.NumeroDocumento}</div>
					)}
				</div>

				{/* --- Campo Apellido y Nombre --- */}
				<div className={`${styles.headerField} ${styles.fullWidthField}`}>
					<label className={`${styles.headerLabel} ${styles.requiredField}`}>
						Apellido y Nombre
					</label>
					<input
						type='text'
						name='ApellidoyNombre'
						value={formData.ApellidoyNombre}
						onChange={handleChange}
						className={styles.headerInput}
						required
					/>
					{errors.ApellidoyNombre && (
						<div className={styles.headerError}>{errors.ApellidoyNombre}</div>
					)}
				</div>
			</div>
		</div>
	);
}
