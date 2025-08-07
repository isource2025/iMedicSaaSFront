import { useState, useEffect } from 'react';
import { PatientFormData } from '@/src/app/types/PatientInterface';
import styles from './Personal.module.css';
import LoadingSelect from './LoadingSelect'; // ¡Importamos nuestro nuevo componente!

interface Option {
	value: string;
	label: string;
}

interface OtherDataTabProps {
	formData: PatientFormData;
	handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
	errors: Record<string, string>;
}

export default function OtherDataTab({ formData, handleChange, errors }: OtherDataTabProps) {
	const [razaOptions, setRazaOptions] = useState<Option[]>([]);
	const [idiomaOptions, setIdiomaOptions] = useState<Option[]>([]);
	const [religionOptions, setReligionOptions] = useState<Option[]>([]);
	const [etniaOptions, setEtniaOptions] = useState<Option[]>([]);
	const [militarOptions, setMilitarOptions] = useState<Option[]>([]);
	const [dadorOptions, setDadorOptions] = useState<Option[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// --- Simulación de una llamada a la API para obtener los datos de los selects ---
		const fetchDropdownData = () => {
			console.log("Simulando carga de datos para 'Otros Datos'...");
			setTimeout(() => {
				// Mock de datos (en un futuro, esto vendría de tu backend)
				setRazaOptions([
					{ value: '1', label: 'Caucásica' },
					{ value: '2', label: 'Mongoloide' },
					{ value: '3', label: 'Negroide' },
				]);
				setIdiomaOptions([
					{ value: 'spa', label: 'Español' },
					{ value: 'eng', label: 'Inglés' },
					{ value: 'por', label: 'Portugués' },
				]);
				setReligionOptions([
					{ value: '1', label: 'Catolicismo' },
					{ value: '2', label: 'Cristianismo' },
					{ value: '3', label: 'Judaísmo' },
					{ value: '4', label: 'Ateísmo/Agnosticismo' },
				]);
				setEtniaOptions([
					{ value: '1', label: 'Latino/Hispano' },
					{ value: '2', label: 'Afrodescendiente' },
					{ value: '3', label: 'Indígena' },
				]);
				setMilitarOptions([
					{ value: 'N', label: 'Ninguno' },
					{ value: 'A', label: 'Activo' },
					{ value: 'R', label: 'Retirado' },
				]);
				setDadorOptions([
					{ value: 'S', label: 'Sí' },
					{ value: 'N', label: 'No' },
					{ value: 'D', label: 'Desconocido' },
				]);

				setIsLoading(false); // Terminamos la carga
				console.log('Datos simulados cargados.');
			}, 700); // Simulamos un retraso de 700ms
		};

		fetchDropdownData();
	}, []);

	return (
		<div className={styles.formContent}>
			<div className={`${styles.formRow} ${styles.double}`}>
				<LoadingSelect
					label='Raza'
					name='Raza'
					value={formData.Raza || ''}
					onChange={handleChange}
					isLoading={isLoading}
					options={razaOptions}
				/>
				<LoadingSelect
					label='Idioma'
					name='Idioma'
					value={formData.Idioma || ''}
					onChange={handleChange}
					isLoading={isLoading}
					options={idiomaOptions}
				/>
			</div>

			<div className={`${styles.formRow} ${styles.double}`}>
				<LoadingSelect
					label='Religión'
					name='Religion'
					value={formData.Religion || ''}
					onChange={handleChange}
					isLoading={isLoading}
					options={religionOptions}
				/>
				<LoadingSelect
					label='Grupo Étnico'
					name='GrupoEtnico'
					value={formData.GrupoEtnico || ''}
					onChange={handleChange}
					isLoading={isLoading}
					options={etniaOptions}
				/>
			</div>

			<div className={`${styles.formRow} ${styles.double}`}>
				<LoadingSelect
					label='Estado Militar'
					name='EstadoMilitar'
					value={formData.EstadoMilitar || ''}
					onChange={handleChange}
					isLoading={isLoading}
					options={militarOptions}
				/>
				<LoadingSelect
					label='Dador de Órganos'
					name='DadorOrganos'
					value={formData.DadorOrganos || ''}
					onChange={handleChange}
					isLoading={isLoading}
					options={dadorOptions}
				/>
			</div>

			{/* Los campos que no son selects se quedan como estaban */}
			<div className={`${styles.formRow} ${styles.double}`}>
				<div className={styles.formGroup}>
					<label className={styles.label}>Lugar de Nacimiento</label>
					<input
						type='text'
						name='LugarNacimiento'
						value={formData.LugarNacimiento || ''}
						onChange={handleChange}
						className={styles.input}
					/>
				</div>
				<div className={styles.formGroup}>
					<label className={styles.label}>Orden de Nacimiento</label>
					<input
						type='number'
						name='OrdenNacimiento'
						value={formData.OrdenNacimiento || ''}
						onChange={handleChange}
						className={styles.input}
					/>
				</div>
			</div>

			<div className={styles.formRow}>
				<div className={styles.formGroup}>
					<label className={styles.label}>Licencia de Conducir</label>
					<input
						type='text'
						name='LicenciaConducir'
						value={formData.LicenciaConducir || ''}
						onChange={handleChange}
						className={styles.input}
					/>
				</div>
			</div>

			<div className={`${styles.formRow} ${styles.double}`}>
				<div className={styles.formGroup}>
					<label className={styles.label}>Fecha de Defunción</label>
					<input
						type='date'
						name='FechaDefuncion'
						value={formData.FechaDefuncion || ''}
						onChange={handleChange}
						className={styles.input}
					/>
				</div>
				<div className={styles.formGroup}>
					<label className={styles.label}>Hora de Defunción</label>
					<input
						type='time'
						name='HoraDefuncion'
						value={formData.HoraDefuncion || ''}
						onChange={handleChange}
						className={styles.input}
					/>
				</div>
			</div>
		</div>
	);
}
