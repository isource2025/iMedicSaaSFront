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
let cachedDropdowns: {
	razaOptions: Option[];
	idiomaOptions: Option[];
	religionOptions: Option[];
	etniaOptions: Option[];
	militarOptions: Option[];
	dadorOptions: Option[];
} | null = null;
export default function OtherDataTab({ formData, handleChange, errors }: OtherDataTabProps) {
	const [razaOptions, setRazaOptions] = useState<Option[]>([]);
	const [idiomaOptions, setIdiomaOptions] = useState<Option[]>([]);
	const [religionOptions, setReligionOptions] = useState<Option[]>([]);
	const [etniaOptions, setEtniaOptions] = useState<Option[]>([]);
	const [militarOptions, setMilitarOptions] = useState<Option[]>([]);
	const [dadorOptions, setDadorOptions] = useState<Option[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Si ya tenemos caché, úsalo y NO simules carga de nuevo
		if (cachedDropdowns) {
			setRazaOptions(cachedDropdowns.razaOptions);
			setIdiomaOptions(cachedDropdowns.idiomaOptions);
			setReligionOptions(cachedDropdowns.religionOptions);
			setEtniaOptions(cachedDropdowns.etniaOptions);
			setMilitarOptions(cachedDropdowns.militarOptions);
			setDadorOptions(cachedDropdowns.dadorOptions);
			setIsLoading(false);
			return;
		}

		// Primera vez: simular carga y luego guardar en caché
		const t = setTimeout(() => {
			const raza = [
				{ value: '1', label: 'Caucásica' },
				{ value: '2', label: 'Mongoloide' },
				{ value: '3', label: 'Negroide' },
			];
			const idioma = [
				{ value: 'spa', label: 'Español' },
				{ value: 'eng', label: 'Inglés' },
				{ value: 'por', label: 'Portugués' },
			];
			const religion = [
				{ value: '1', label: 'Catolicismo' },
				{ value: '2', label: 'Cristianismo' },
				{ value: '3', label: 'Judaísmo' },
				{ value: '4', label: 'Ateísmo/Agnosticismo' },
			];
			const etnia = [
				{ value: '1', label: 'Latino/Hispano' },
				{ value: '2', label: 'Afrodescendiente' },
				{ value: '3', label: 'Indígena' },
			];
			const militar = [
				{ value: 'N', label: 'Ninguno' },
				{ value: 'A', label: 'Activo' },
				{ value: 'R', label: 'Retirado' },
			];
			const dador = [
				{ value: 'S', label: 'Sí' },
				{ value: 'N', label: 'No' },
				{ value: 'D', label: 'Desconocido' },
			];

			// setea estado
			setRazaOptions(raza);
			setIdiomaOptions(idioma);
			setReligionOptions(religion);
			setEtniaOptions(etnia);
			setMilitarOptions(militar);
			setDadorOptions(dador);
			setIsLoading(false);

			// guarda en caché de módulo
			cachedDropdowns = {
				razaOptions: raza,
				idiomaOptions: idioma,
				religionOptions: religion,
				etniaOptions: etnia,
				militarOptions: militar,
				dadorOptions: dador,
			};
		}, 700);

		return () => clearTimeout(t);
	}, []);

	return (
		<div className={styles.formContent}>
			<div className={`${styles.formRow} ${styles.double}`}>
				<LoadingSelect
					label='Raza'
					name='Raza'
					value={formData.Raza || ''}
					onChange={(val) =>
						handleChange({ target: { name: 'Raza', value: val } } as any)
					}
					isLoading={isLoading}
					options={razaOptions}
				/>
				<LoadingSelect
					label='Idioma'
					name='Idioma'
					value={formData.Idioma || ''}
					onChange={(val) =>
						handleChange({ target: { name: 'Idioma', value: val } } as any)
					}
					isLoading={isLoading}
					options={idiomaOptions}
				/>
			</div>

			<div className={`${styles.formRow} ${styles.double}`}>
				<LoadingSelect
					label='Religión'
					name='Religion'
					value={formData.Religion || ''}
					onChange={(val) =>
						handleChange({ target: { name: 'Religion', value: val } } as any)
					}
					isLoading={isLoading}
					options={religionOptions}
				/>
				<LoadingSelect
					label='Grupo Étnico'
					name='GrupoEtnico'
					value={formData.GrupoEtnico || ''}
					onChange={(val) =>
						handleChange({ target: { name: 'GrupoEtnico', value: val } } as any)
					}
					isLoading={isLoading}
					options={etniaOptions}
				/>
			</div>

			<div className={`${styles.formRow} ${styles.double}`}>
				<LoadingSelect
					label='Estado Militar'
					name='EstadoMilitar'
					value={formData.EstadoMilitar || ''}
					onChange={(val) =>
						handleChange({ target: { name: 'EstadoMilitar', value: val } } as any)
					}
					isLoading={isLoading}
					options={militarOptions}
				/>
				<LoadingSelect
					label='Dador de Órganos'
					name='DadorOrganos'
					value={formData.DadorOrganos || ''}
					onChange={(val) =>
						handleChange({ target: { name: 'DadorOrganos', value: val } } as any)
					}
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
