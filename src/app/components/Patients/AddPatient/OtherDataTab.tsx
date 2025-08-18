import { useState, useEffect } from 'react';
import { apiService } from '@/src/app/services/axios';
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
// Caché simple en memoria módulo para evitar múltiples requests
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
	console.log('[OtherDataTab] Renderizado, isLoading:', isLoading);
	console.log('[OtherDataTab] formData actual:', formData);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			if (cachedDropdowns) {
				if (cancelled) return;
				setRazaOptions(cachedDropdowns.razaOptions);
				setIdiomaOptions(cachedDropdowns.idiomaOptions);
				setReligionOptions(cachedDropdowns.religionOptions);
				setEtniaOptions(cachedDropdowns.etniaOptions);
				setMilitarOptions(cachedDropdowns.militarOptions);
				setDadorOptions(cachedDropdowns.dadorOptions);
				setIsLoading(false);
				return;
			}
			setIsLoading(true);
			try {
				const [razaRes, idiomaRes, religionRes, etniaRes, militarRes, dadorRes] =
					await Promise.all([
						apiService.get('/raza'),
						apiService.get('/idiomas-iso'),
						apiService.get('/religion'),
						apiService.get('/grupo-etnico'),
						apiService.get('/estado-militar'),
						apiService.get('/dador-organos'),
					]);
				const toOptions = (
					arr: any[],
					valueKey = 'Valor',
					labelKey = 'Descripcion',
				): Option[] =>
					arr?.map((i) => ({ value: String(i[valueKey]), label: i[labelKey] })) ||
					[];
				const razaData: any = (razaRes as any).data;
				const idiomaData: any = (idiomaRes as any).data;
				const religionData: any = (religionRes as any).data;
				const etniaData: any = (etniaRes as any).data;
				const militarData: any = (militarRes as any).data;
				const dadorData: any = (dadorRes as any).data;
				const raza = toOptions(razaData.data || razaData);
				const idioma = toOptions(
					idiomaData.data || idiomaData,
					'CodigoISO',
					'Descripcion',
				);
				const religion = toOptions(religionData.data || religionData);
				const etnia = toOptions(etniaData.data || etniaData);
				const militar = toOptions(militarData.data || militarData);
				const dador = toOptions(dadorData.data || dadorData);
				if (cancelled) return;
				setRazaOptions(raza);
				setIdiomaOptions(idioma);
				setReligionOptions(religion);
				setEtniaOptions(etnia);
				setMilitarOptions(militar);
				setDadorOptions(dador);
				cachedDropdowns = {
					razaOptions: raza,
					idiomaOptions: idioma,
					religionOptions: religion,
					etniaOptions: etnia,
					militarOptions: militar,
					dadorOptions: dador,
				};
			} catch (err) {
				console.error('[OtherDataTab] Error cargando catálogos', err);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	// Log de depuración cuando se termina de cargar catálogos o cambia formData relevante
	useEffect(() => {
		if (!isLoading) {
			console.log('[OtherDataTab][debug] formData valores actuales:', {
				Raza: formData.Raza,
				Idioma: formData.Idioma || (formData as any).IdiomaPrimario,
				Religion: formData.Religion,
				GrupoEtnico: formData.GrupoEtnico,
				EstadoMilitar: formData.EstadoMilitar,
				DadorOrganos: formData.DadorOrganos,
			});
			console.log('[OtherDataTab][debug] opciones (sizes):', {
				ra: razaOptions.length,
				id: idiomaOptions.length,
				rel: religionOptions.length,
				etn: etniaOptions.length,
				mil: militarOptions.length,
				dad: dadorOptions.length,
			});
		}
	}, [
		isLoading,
		formData.Raza,
		formData.Idioma,
		formData.Religion,
		formData.GrupoEtnico,
		formData.EstadoMilitar,
		formData.DadorOrganos,
	]);

	return (
		<div className={styles.formContent}>
			{/* Línea 1: Raza / Idioma */}
			<div className={styles.formRow + ' ' + styles.double}>
				<LoadingSelect
					label='Raza:'
					name='Raza'
					value={formData.Raza ? String(formData.Raza) : ''}
					onChange={(val) =>
						handleChange({ target: { name: 'Raza', value: val } } as any)
					}
					isLoading={isLoading}
					options={razaOptions}
					previewData={
						!isLoading
							? undefined
							: formData.Raza
							? { value: String(formData.Raza) }
							: undefined
					}
				/>
				<LoadingSelect
					label='Idioma:'
					name='Idioma'
					value={formData.Idioma ? String(formData.Idioma) : ''}
					onChange={(val) =>
						handleChange({ target: { name: 'Idioma', value: val } } as any)
					}
					isLoading={isLoading}
					options={idiomaOptions}
					previewData={
						!isLoading
							? undefined
							: formData.Idioma
							? { value: String(formData.Idioma) }
							: undefined
					}
				/>
			</div>
			{/* Línea 2: Religión / Grupo Étnico */}
			<div className={styles.formRow + ' ' + styles.double}>
				<LoadingSelect
					label='Religión:'
					name='Religion'
					value={formData.Religion ? String(formData.Religion) : ''}
					onChange={(val) =>
						handleChange({ target: { name: 'Religion', value: val } } as any)
					}
					isLoading={isLoading}
					options={religionOptions}
					previewData={
						!isLoading
							? undefined
							: formData.Religion
							? { value: String(formData.Religion) }
							: undefined
					}
				/>
				<LoadingSelect
					label='Grupo Étnico:'
					name='GrupoEtnico'
					value={formData.GrupoEtnico ? String(formData.GrupoEtnico) : ''}
					onChange={(val) =>
						handleChange({ target: { name: 'GrupoEtnico', value: val } } as any)
					}
					isLoading={isLoading}
					options={etniaOptions}
					previewData={
						!isLoading
							? undefined
							: formData.GrupoEtnico
							? { value: String(formData.GrupoEtnico) }
							: undefined
					}
				/>
			</div>
			{/* Línea 3: Estado Militar / Dador Órganos */}
			<div className={styles.formRow + ' ' + styles.double}>
				<LoadingSelect
					label='Estado Militar:'
					name='EstadoMilitar'
					value={formData.EstadoMilitar ? String(formData.EstadoMilitar) : ''}
					onChange={(val) =>
						handleChange({ target: { name: 'EstadoMilitar', value: val } } as any)
					}
					isLoading={isLoading}
					options={militarOptions}
					previewData={
						!isLoading
							? undefined
							: formData.EstadoMilitar
							? { value: String(formData.EstadoMilitar) }
							: undefined
					}
				/>
				<LoadingSelect
					label='Dador Órganos:'
					name='DadorOrganos'
					value={formData.DadorOrganos ? String(formData.DadorOrganos) : ''}
					onChange={(val) =>
						handleChange({ target: { name: 'DadorOrganos', value: val } } as any)
					}
					isLoading={isLoading}
					options={dadorOptions}
					previewData={
						!isLoading
							? undefined
							: formData.DadorOrganos
							? { value: String(formData.DadorOrganos) }
							: undefined
					}
				/>
			</div>
			{/* Línea 4: Licencia Auto (campo completo) */}
			<div className={styles.formRow}>
				<div className={styles.formGroup}>
					<label className={styles.label}>Licencia Auto:</label>
					<input
						type='text'
						name='LicenciaConducir'
						value={formData.LicenciaConducir || ''}
						onChange={handleChange}
						className={styles.input}
					/>
				</div>
			</div>
			{/* Cajas agrupadas */}
			<div className={styles.groupBoxes}>
				<div className={styles.groupBox}>
					<h4 className={styles.groupTitle}>En Caso de Nacimientos Múltiples</h4>
					<div className={styles.groupInner}>
						<div className={styles.formGroupCompact}>
							<label className={styles.label}>Orden Nacim.:</label>
							<input
								type='number'
								name='OrdenNacimiento'
								value={formData.OrdenNacimiento || ''}
								onChange={handleChange}
								className={styles.input}
							/>
						</div>
						<div className={styles.formGroupCompact}>
							<label className={styles.label}>Lugar Nacim.:</label>
							<input
								type='text'
								name='LugarNacimiento'
								value={formData.LugarNacimiento || ''}
								onChange={handleChange}
								className={styles.input}
							/>
						</div>
					</div>
				</div>
				<div className={styles.groupBox}>
					<h4 className={styles.groupTitle}>En Caso de Defunción</h4>
					<div className={styles.groupInner}>
						<div className={styles.formGroupCompact}>
							<label className={styles.label}>Fecha Defunción:</label>
							<input
								type='date'
								name='FechaDefuncion'
								value={formData.FechaDefuncion || ''}
								onChange={handleChange}
								className={styles.input}
							/>
						</div>
						<div className={styles.formGroupCompact}>
							<label className={styles.label}>Hora Defunción:</label>
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
			</div>
		</div>
	);
}
