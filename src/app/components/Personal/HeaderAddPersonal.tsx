'use client';

import { PersonalFormData } from '../../types/personal';
import styles from '../Patients/AddPatient/Header.module.css';
import CustomSelect from '../Patients/AddPatient/LoadingSelect';
import { PhotoUploader } from '../Patients/AddPatient/PhotoUploader';

interface HeaderAddPersonalProps {
	displayId: string | number;
	formData: PersonalFormData;
	handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
	errors: Record<string, string>;
	tiposDocumento: { value: string; label: string }[];
	getRenaperInfo: (e: React.MouseEvent) => void;
	buscandoRenaper: boolean;
	photoPreview?: string | null;
	onPhotoChange: (file: File | null) => void;
	setPhotoUploading: (isUploading: boolean) => void;
}

export default function HeaderAddPersonal({
	displayId,
	formData,
	handleChange,
	errors,
	tiposDocumento,
	getRenaperInfo,
	buscandoRenaper,
	photoPreview = null,
	onPhotoChange,
	setPhotoUploading,
}: HeaderAddPersonalProps) {
	return (
		<div className={styles.headerContainer}>
			<div className={styles.headerPhoto}>
				<PhotoUploader
					onPhotoChange={onPhotoChange}
					initialPreview={photoPreview}
					setPhotoUploading={setPhotoUploading}
					title='Foto del personal'
				/>
			</div>
			<div>
				<div className={styles.fieldsGrid}>
					<div className={styles.headerField}>
						<label className={styles.headerLabel}>ID</label>
						<input
							type='text'
							value={displayId}
							readOnly
							disabled
							className={styles.headerInput}
							tabIndex={-1}
						/>
					</div>

					<div className={styles.headerField}>
						<label className={`${styles.headerLabel} ${styles.requiredField}`}>
							Tipo Documento
						</label>
						<CustomSelect
							label=''
							name='TipoDocumento'
							value={formData.TipoDocumento || ''}
							onChange={(val) =>
								handleChange({
									target: { name: 'TipoDocumento', value: String(val) },
								} as React.ChangeEvent<HTMLSelectElement>)
							}
							options={tiposDocumento}
							isLoading={tiposDocumento.length === 0}
							tabIndex={1}
						/>
						{errors.TipoDocumento && (
							<div className={styles.headerError}>{errors.TipoDocumento}</div>
						)}
					</div>

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
								className={`${styles.headerInput} ${styles.documentInput}`}
								tabIndex={2}
								inputMode='numeric'
							/>
							{!buscandoRenaper ? (
								<button
									type='button'
									onClick={getRenaperInfo}
									className={styles.searchButton}
									title='Buscar en RENAPER'
									tabIndex={3}
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
				</div>

				<div className={`${styles.headerField} ${styles.fullWidthField}`}>
					<label className={`${styles.headerLabel} ${styles.requiredField}`}>
						Apellido y Nombre
					</label>
					<input
						type='text'
						name='ApellidoNombre'
						value={formData.ApellidoNombre}
						onChange={handleChange}
						className={styles.headerInput}
						required
						tabIndex={4}
					/>
					{errors.ApellidoNombre && (
						<div className={styles.headerError}>{errors.ApellidoNombre}</div>
					)}
				</div>
			</div>
		</div>
	);
}
