import { PatientFormData } from '@/src/app/types/PatientInterface';
import { Localidad } from '@/src/app/services/localidadService';
import styles from './Personal.module.css';
import LoadingSelect from './LoadingSelect';
import { useEffect, useState } from 'react';

interface OtherDataTabProps {
	formData: PatientFormData;
	errors: Record<string, string>;
	handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
	localidadOptions: Localidad[];
	loading: {
		localidad: boolean;
		sexo: boolean;
		cobertura: boolean;
		estadoCivil: boolean;
	};
	sexoOptions: { valor: string; descripcion: string }[];
	estadosCiviles: { value: string; label: string }[];
	coberturaOptions: { value: string; label: string }[];
}

export default function PersonalDataTab({
	formData,
	errors,
	handleChange,
	localidadOptions,
	loading,
	sexoOptions,
	coberturaOptions,
	estadosCiviles,
}: OtherDataTabProps) {
	// mapear opciones al formato del LoadingSelect
	const [edad, setEdad] = useState(0);
	const localidadSelectOptions = localidadOptions.map((l) => ({
		value: String(l.Valor),
		label: l.NombreLocalidad,
	}));

	const sexoSelectOptions = sexoOptions.map((s) => ({
		value: s.valor,
		label: s.descripcion,
	}));

	const estadoCivilSelectOptions = estadosCiviles; // ya viene en {value,label}

	useEffect(() => {
		const calcularEdad = () => {
			if (formData.FechaNacimiento) {
				const [año, mes, dia] = formData.FechaNacimiento.split('-').map(Number);
				const hoy = new Date();
				let edad = hoy.getFullYear() - año;
				if (
					hoy.getMonth() + 1 < mes ||
					(hoy.getMonth() + 1 === mes && hoy.getDate() < dia)
				) {
					edad--;
				}
				setEdad(edad);
			}
		};
		calcularEdad();
	}, [formData.FechaNacimiento]);

	return (
		<div className={styles.formContent}>
			{/* Domicilio */}
			<div className={styles.formRow}>
				<div className={styles.formGroup}>
					<label className={`${styles.label}`}>Domicilio en:</label>
					<input
						type='text'
						name='Domicilio'
						value={formData.Domicilio}
						onChange={handleChange}
						className={`${styles.input} ${errors.Domicilio ? styles.error : ''}`}
					/>
					{errors.Domicilio && (
						<div className={styles.errorMessage}>{errors.Domicilio}</div>
					)}
				</div>
			</div>

			{/* Localidad / Provincia */}
			<div className={`${styles.formRow} ${styles.three}`}>
				<LoadingSelect
					label='Localidad:'
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

				{/* Nacionalidad */}
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
			<div className={`${styles.formRow} ${styles.three}`}>
				<div className={styles.formGroup}>
					<label className={`${styles.label}`}>Fecha de Nacimiento:</label>
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

				<div className={styles.formGroup}>
					<label className={`${styles.label}`}>Hora:</label>
					<input
						type='time'
						name='Hora'
						value={formData.Hora}
						onChange={handleChange}
						className={`${styles.input} ${errors.Hora ? styles.error : ''}`}
					/>
					{errors.Hora && <div className={styles.errorMessage}>{errors.Hora}</div>}
				</div>

				<div className={styles.formGroup}>
					<label className={`${styles.label}`}>Edad:</label>
					<input
						disabled
						type='number'
						name='Edad'
						value={edad}
						onChange={handleChange}
						className={`${styles.input} ${errors.Edad ? styles.error : ''}`}
					/>
				</div>
			</div>

			{/* Sexo y Estado Civil en la misma fila */}
			<div className={`${styles.formRow} ${styles.three}`}>
				<div className={styles.formGroup}>
					<label className={`${styles.label}`}>CUIT/CU:</label>
					<input
						type='text'
						name='CUIT'
						placeholder='00-00000000-0'
						value={formData.CUIT}
						onChange={handleChange}
						className={`${styles.input} ${errors.CUIT ? styles.error : ''}`}
					/>
					{errors.CUIT && <div className={styles.errorMessage}>{errors.CUIT}</div>}
				</div>
				<div>
					<LoadingSelect
						label='Sexo:'
						name='Sexo'
						value={formData.Sexo || ''}
						onChange={(val) =>
							handleChange({ target: { name: 'Sexo', value: val } } as any)
						}
						isLoading={loading.sexo}
						options={sexoSelectOptions}
					/>
					{errors.Sexo && <div className={styles.errorMessage}>{errors.Sexo}</div>}
				</div>
				<div>
					<LoadingSelect
						label='Estado Civil:'
						name='EstadoCivil'
						value={formData.EstadoCivil || ''}
						onChange={(val) =>
							handleChange({
								target: { name: 'EstadoCivil', value: val },
							} as any)
						}
						isLoading={loading.estadoCivil}
						options={estadoCivilSelectOptions}
					/>
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

			<div className={`${styles.formRow} ${styles.double}`}>
				<LoadingSelect
					name='Cobertura'
					label='Cobertura:'
					value={Number(formData.Cobertura) || ''}
					onChange={(val) =>
						handleChange({ target: { name: 'Cobertura', value: val } } as any)
					}
					isLoading={loading.cobertura}
					options={coberturaOptions}
				/>
				{errors.Cobertura && (
					<div className={styles.errorMessage}>{errors.Cobertura}</div>
				)}
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
