import { PatientFormData } from '@/src/app/types/PatientInterface';
import { Localidad } from '@/src/app/services/localidadService';
import styles from './Personal.module.css';
// import styles from '@/src/app/components/modals/ModalAddPatient/styles.module.css';

interface PersonalDataTabProps {
	// Define the props needed for this component
	formData: PatientFormData;
	errors: Record<string, string>;
	handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
	localidadOptions: Localidad[];
	loading: {
		localidad: boolean;
		sexo: boolean;
	};
	sexoOptions: { valor: string; descripcion: string }[];
	estadosCiviles: { value: string; label: string }[];
	onClose: () => void;
	isSubmitting: boolean;
	isEditing?: boolean;
}
export default function PersonalDataTab({
	formData,
	errors,
	handleChange,
	localidadOptions,
	loading,
	sexoOptions,
	estadosCiviles,
	onClose,
	isSubmitting,
	isEditing = false,
}: PersonalDataTabProps) {
	return (
		<>
			<div className={styles.formContent}>
				<div className={styles.formRow}>
					<div className={styles.formGroup}>
						<label className={`${styles.label} ${styles.requiredField}`}>
							Domicilio
						</label>
						<input
							type='text'
							name='Domicilio'
							value={formData.Domicilio}
							onChange={handleChange}
							className={`${styles.input} ${
								errors.Domicilio ? styles.error : ''
							}`}
						/>
						{errors.Domicilio && (
							<div className={styles.errorMessage}>{errors.Domicilio}</div>
						)}
					</div>
				</div>
				<div className={`${styles.formRow} ${styles.double}`}>
					<div className={styles.formGroup}>
						<label className={styles.label}>Localidad</label>
						<select
							name='ValorLocalidad'
							value={formData.ValorLocalidad}
							onChange={handleChange}
							className={`${styles.select} ${
								errors.ValorLocalidad ? styles.error : ''
							}`}
						>
							<option value=''>Seleccione...</option>
							{localidadOptions.map((localidad) => (
								<option key={localidad.Valor} value={localidad.Valor}>
									{localidad.NombreLocalidad}
								</option>
							))}
						</select>
						{loading.localidad && (
							<span
								style={{
									marginLeft: '0.5rem',
									fontSize: '0.75rem',
									color: '#0083A9',
								}}
							>
								Cargando...
							</span>
						)}
					</div>
					<div className={styles.formGroup}>
						<label className={styles.label}>Provincia</label>
						<input
							disabled
							type='text'
							name='Provincia'
							value={formData.Provincia}
							onChange={handleChange}
							className={`${styles.input} ${
								errors.Provincia ? styles.error : ''
							}`}
						/>
						{errors.Provincia && (
							<div className={styles.errorMessage}>{errors.Provincia}</div>
						)}
					</div>
				</div>

				<div className={styles.formRow}>
					<div className={styles.formGroup}>
						<label className={styles.label}>Nacionalidad</label>
						<input
							disabled
							type='text'
							name='Nacionalidad'
							value={formData.Nacionalidad}
							onChange={handleChange}
							className={`${styles.input} ${
								errors.Nacionalidad ? styles.error : ''
							}`}
						/>
						{errors.Nacionalidad && (
							<div className={styles.errorMessage}>{errors.Nacionalidad}</div>
						)}
					</div>
				</div>

				<div className={styles.formRow}>
					<div className={styles.formGroup}>
						<label className={styles.label}>Fecha de Nacimiento</label>
						<input
							type='date'
							name='FechaNacimiento'
							value={formData.FechaNacimiento}
							onChange={handleChange}
							className={`${styles.input} ${
								errors.FechaNacimiento ? styles.error : ''
							}`}
						/>
						{errors.FechaNacimiento && (
							<div className={styles.errorMessage}>{errors.FechaNacimiento}</div>
						)}
					</div>
				</div>

				<div className={styles.formRow}>
					<div className={styles.formGroup}>
						<label className={styles.label}>CUIT/CUIL</label>
						<input
							type='text'
							name='CUIT'
							value={formData.CUIT}
							onChange={handleChange}
							className={`${styles.input} ${errors.CUIT ? styles.error : ''}`}
							placeholder='XX-XXXXXXXX-X'
						/>
						{errors.CUIT && (
							<div className={styles.errorMessage}>{errors.CUIT}</div>
						)}
					</div>
				</div>

				<div className={styles.formRow}>
					<div className={styles.formGroup}>
						<label className={styles.label}>Sexo</label>
						<select
							name='Sexo'
							value={formData.Sexo}
							onChange={handleChange}
							className={`${styles.select} ${errors.Sexo ? styles.error : ''}`}
						>
							<option value=''>Seleccione...</option>
							{sexoOptions.map((sexo) => (
								<option key={sexo.valor} value={sexo.valor}>
									{sexo.descripcion}
								</option>
							))}
						</select>
						{loading.sexo && (
							<span
								style={{
									marginLeft: '0.5rem',
									fontSize: '0.75rem',
									color: '#0083A9',
								}}
							>
								Cargando...
							</span>
						)}
						{errors.Sexo && (
							<div className={styles.errorMessage}>{errors.Sexo}</div>
						)}
					</div>
				</div>

				<div className={styles.formRow}>
					<div className={styles.formGroup}>
						<label className={styles.label}>Estado Civil</label>
						<select
							name='EstadoCivil'
							value={formData.EstadoCivil}
							onChange={handleChange}
							className={`${styles.select} ${
								errors.EstadoCivil ? styles.error : ''
							}`}
						>
							{estadosCiviles.map((estado) => (
								<option key={estado.value} value={estado.value}>
									{estado.label}
								</option>
							))}
						</select>
						{errors.EstadoCivil && (
							<div className={styles.errorMessage}>{errors.EstadoCivil}</div>
						)}
					</div>
				</div>

				<div className={styles.formContent}>
					<div className={`${styles.formRow} ${styles.double}`}>
						<div className={styles.formGroup}>
							<label className={styles.label}>Teléfono Particular</label>
							<input
								type='text'
								name='TelefonoParticular'
								value={formData.TelefonoParticular}
								onChange={handleChange}
								className={`${styles.input} ${
									errors.TelefonoParticular ? styles.error : ''
								}`}
							/>
							{errors.TelefonoParticular && (
								<div className={styles.errorMessage}>
									{errors.TelefonoParticular}
								</div>
							)}
						</div>
						<div className={styles.formGroup}>
							<label className={styles.label}>Teléfono Negocio</label>
							<input
								type='text'
								name='TelefonoNegocio'
								value={formData.TelefonoNegocio}
								onChange={handleChange}
								className={`${styles.input} ${
									errors.TelefonoNegocio ? styles.error : ''
								}`}
							/>
							{errors.TelefonoNegocio && (
								<div className={styles.errorMessage}>
									{errors.TelefonoNegocio}
								</div>
							)}
						</div>
					</div>
				</div>

				<div className={styles.formRow}>
					<div className={styles.formGroup}>
						<label className={styles.label}>Mail</label>
						<input
							type='email'
							name='Mail'
							value={formData.Mail}
							onChange={handleChange}
							className={`${styles.input} ${errors.Mail ? styles.error : ''}`}
						/>
						{errors.Mail && (
							<div className={styles.errorMessage}>{errors.Mail}</div>
						)}
					</div>
				</div>

				<div className={styles.formContent}>
					<div className={`${styles.formRow} ${styles.double}`}>
						<div className={styles.formGroup}>
							<label className={styles.label}>Número de Cuenta</label>
							<input
								type='text'
								name='NumeroCuenta'
								value={formData.NumeroCuenta}
								onChange={handleChange}
								className={`${styles.input} ${
									errors.NumeroCuenta ? styles.error : ''
								}`}
							/>
							{errors.NumeroCuenta && (
								<div className={styles.errorMessage}>
									{errors.NumeroCuenta}
								</div>
							)}
						</div>
						<div className={styles.formGroup}>
							<label className={styles.label}>SSN</label>
							<input
								type='text'
								name='NumeroSSN'
								value={formData.NumeroSSN}
								onChange={handleChange}
								className={`${styles.input} ${
									errors.NumeroSSN ? styles.error : ''
								}`}
							/>
							{errors.NumeroSSN && (
								<div className={styles.errorMessage}>{errors.NumeroSSN}</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
