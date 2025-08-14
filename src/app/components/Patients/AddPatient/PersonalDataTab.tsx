import { PatientFormData } from '@/src/app/types/PatientInterface';
import { Localidad } from '@/src/app/services/localidadService';
import styles from './Personal.module.css';
import LoadingSelect from './LoadingSelect';

interface OtherDataTabProps {
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
}

export default function PersonalDataTab({
	formData,
	errors,
	handleChange,
	localidadOptions,
	loading,
	sexoOptions,
	estadosCiviles,
}: OtherDataTabProps) {
	// mapear opciones al formato del LoadingSelect
	const localidadSelectOptions = localidadOptions.map((l) => ({
		value: String(l.Valor),
		label: l.NombreLocalidad,
	}));

	const sexoSelectOptions = sexoOptions.map((s) => ({
		value: s.valor,
		label: s.descripcion,
	}));

	const estadoCivilSelectOptions = estadosCiviles; // ya viene en {value,label}

	return (
		<div className={styles.formContent}>
			{/* Domicilio */}
			<div className={styles.formRow}>
				<div className={styles.formGroup}>
					<label className={`${styles.label} ${styles.requiredField}`}>
						Domicilio en:
					</label>
					<input
						type='text'
						name='Domicilio'
						value={formData.Domicilio}
						onChange={handleChange}
						className={`${styles.input} ${errors.Domicilio ? styles.error : ''}`}
						required
					/>
					{errors.Domicilio && (
						<div className={styles.errorMessage}>{errors.Domicilio}</div>
					)}
				</div>
			</div>

			{/* Localidad / Provincia */}
			<div className={`${styles.formRow} ${styles.double}`}>
				<div className={styles.formGroup}>
					<label className={styles.label}>Localidad:</label>
					<div>
						<LoadingSelect
							label=''
							name='ValorLocalidad'
							value={formData.ValorLocalidad || ''}
							onChange={(val) =>
								handleChange({
									target: { name: 'ValorLocalidad', value: val },
								} as any)
							}
							isLoading={loading.localidad}
							options={localidadSelectOptions}
						/>
					</div>
				</div>
				<div className={styles.formGroup}>
					<label className={styles.label}>Provincia:</label>
					<input
						disabled
						type='text'
						name='Provincia'
						value={formData.Provincia}
						onChange={handleChange}
						className={`${styles.input} ${errors.Provincia ? styles.error : ''}`}
					/>
					{errors.Provincia && (
						<div className={styles.errorMessage}>{errors.Provincia}</div>
					)}
				</div>
			</div>

			{/* Nacionalidad */}
			<div className={styles.formRow}>
				<div className={styles.formGroup}>
					<label className={styles.label}>Nacionalidad:</label>
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

			{/* Fecha Nacimiento */}
			<div className={styles.formRow}>
				<div className={styles.formGroup}>
					<label className={`${styles.label} ${styles.requiredField}`}>
						Fecha de Nacimiento:
					</label>
					<input
						type='date'
						name='FechaNacimiento'
						value={formData.FechaNacimiento}
						onChange={handleChange}
						className={`${styles.input} ${
							errors.FechaNacimiento ? styles.error : ''
						}`}
						required
					/>
					{errors.FechaNacimiento && (
						<div className={styles.errorMessage}>{errors.FechaNacimiento}</div>
					)}
				</div>
			</div>

			{/* Sexo y Estado Civil en la misma fila */}
			<div className={`${styles.formRow} ${styles.double}`}>
				<div className={styles.formGroup}>
					<label className={styles.label}>Sexo:</label>
					<div>
						<LoadingSelect
							label=''
							name='Sexo'
							value={formData.Sexo || ''}
							onChange={(val) =>
								handleChange({ target: { name: 'Sexo', value: val } } as any)
							}
							isLoading={loading.sexo}
							options={sexoSelectOptions}
						/>
					</div>
					{errors.Sexo && <div className={styles.errorMessage}>{errors.Sexo}</div>}
				</div>
				<div className={styles.formGroup}>
					<label className={styles.label}>Estado Civil:</label>
					<div>
						<LoadingSelect
							label=''
							name='EstadoCivil'
							value={formData.EstadoCivil || ''}
							onChange={(val) =>
								handleChange({
									target: { name: 'EstadoCivil', value: val },
								} as any)
							}
							isLoading={false}
							options={estadoCivilSelectOptions}
						/>
					</div>
					{errors.EstadoCivil && (
						<div className={styles.errorMessage}>{errors.EstadoCivil}</div>
					)}
				</div>
			</div>

			{/* Teléfonos */}
			<div className={`${styles.formRow} ${styles.double}`}>
				<div className={styles.formGroup}>
					<label className={styles.label}>Teléfono Particular:</label>
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
						<div className={styles.errorMessage}>{errors.TelefonoParticular}</div>
					)}
				</div>
				<div className={styles.formGroup}>
					<label className={styles.label}>Teléfono Celular:</label>
					<input
						type='text'
						name='TelefonoCelular'
						value={formData.TelefonoCelular}
						onChange={handleChange}
						className={`${styles.input} ${
							errors.TelefonoCelular ? styles.error : ''
						}`}
					/>
					{errors.TelefonoCelular && (
						<div className={styles.errorMessage}>{errors.TelefonoCelular}</div>
					)}
				</div>
			</div>

			{/* Mail */}
			<div className={styles.formRow}>
				<div className={styles.formGroup}>
					<label className={styles.label}>Correo Electrónico:</label>
					<input
						type='email'
						name='Mail'
						value={formData.Mail}
						onChange={handleChange}
						className={`${styles.input} ${errors.Mail ? styles.error : ''}`}
					/>
					{errors.Mail && <div className={styles.errorMessage}>{errors.Mail}</div>}
				</div>
			</div>

			{/* Cuenta / SSN */}
			<div className={`${styles.formRow} ${styles.double}`}>
				<div className={styles.formGroup}>
					<label className={styles.label}>Número de Cobertura:</label>
					<input
						type='text'
						name='Cobertura'
						value={formData.Cobertura}
						onChange={handleChange}
						className={`${styles.input} ${errors.Cobertura ? styles.error : ''}`}
					/>
					{errors.Cobertura && (
						<div className={styles.errorMessage}>{errors.Cobertura}</div>
					)}
				</div>
				<div className={styles.formGroup}>
					<label className={styles.label}>Número de Afiliado:</label>
					<input
						type='text'
						name='nAfiliado'
						value={formData.nAfiliado}
						onChange={handleChange}
						className={`${styles.input} ${errors.nAfiliado ? styles.error : ''}`}
					/>
					{errors.nAfiliado && (
						<div className={styles.errorMessage}>{errors.nAfiliado}</div>
					)}
				</div>
			</div>
		</div>
	);
}
