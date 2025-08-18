import { PatientFormData } from '../../types/PatientInterface';
import { Sexo, sexoService } from '../../services/sexoService';
import { Localidad, localidadService } from '../../services/localidadService';
import { provinciaService } from '../../services/provinciaService';
import { clarionDateToDate } from '../../utils/dateUtils';
import HeaderAddPatient from './AddPatient/HeaderAddPatient';
import PersonalDataTab from './AddPatient/PersonalDataTab';
import OtherDataTab from './AddPatient/OtherDataTab';
import LaboralDataTab from './AddPatient/LaboralDataTab';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import styles from '../../components/modals/ModalAddPatient/styles.module.css';
import React, { useState, useEffect, useRef } from 'react';

interface PatientFormBaseProps {
	onSubmit: (data: any) => Promise<boolean> | boolean;
	initialData?: Partial<PatientFormData>;
	isEditing?: boolean;
	isSubmitting?: boolean; // externo (lista)
	onClose: () => void;
}

type Tab = 'personal' | 'other' | 'laboral';

// Adaptamos a formato {value,label} que esperan los subcomponentes
const tiposDocumento = [
	{ value: 'DNI', label: 'DNI' },
	{ value: 'LC', label: 'LC' },
	{ value: 'LE', label: 'LE' },
	{ value: 'PAS', label: 'PAS' },
];
const estadosCiviles = [
	{ value: 'SOLTERO', label: 'SOLTERO' },
	{ value: 'CASADO', label: 'CASADO' },
	{ value: 'DIVORCIADO', label: 'DIVORCIADO' },
	{ value: 'VIUDO', label: 'VIUDO' },
	{ value: 'UNIÓN CIVIL', label: 'UNIÓN CIVIL' },
];

const buildInitialFormData = (d?: Partial<PatientFormData>): PatientFormData => ({
	IDPaciente: d?.IDPaciente,
	NumeroHC: d?.NumeroHC || '',
	TipoDocumento: d?.TipoDocumento || 'DNI',
	NumeroDocumento: d?.NumeroDocumento || '',
	ApellidoyNombre: d?.ApellidoyNombre || '',
	Domicilio: d?.Domicilio || '',
	ValorLocalidad: d?.ValorLocalidad || '',
	Provincia: d?.Provincia || '',
	Nacionalidad: d?.Nacionalidad || 'Argentina',
	FechaNacimiento: d?.FechaNacimiento || '',
	CUIT: d?.CUIT || '',
	Sexo: d?.Sexo || 'M',
	EstadoCivil: d?.EstadoCivil || 'SOLTERO',
	TelefonoParticular: d?.TelefonoParticular || '',
	TelefonoCelular: d?.TelefonoCelular || '',
	Mail: d?.Mail || '',
	Cobertura: d?.Cobertura || '',
	nAfiliado: d?.nAfiliado || '',
	FotoURL: d?.FotoURL || null,
	Raza: d?.Raza || '',
	// Mapear posible campo backend IdiomaPrimario al alias Idioma
	Idioma: d?.Idioma || d?.IdiomaPrimario || '',
	Religion: d?.Religion || '',
	GrupoEtnico: d?.GrupoEtnico || '',
	EstadoMilitar: d?.EstadoMilitar || '',
	LicenciaConducir: d?.LicenciaConducir || '',
	DadorOrganos: d?.DadorOrganos || '',
	OrdenNacimiento: d?.OrdenNacimiento || '',
	LugarNacimiento: d?.LugarNacimiento || '',
	FechaDefuncion: d?.FechaDefuncion || '',
	HoraDefuncion: d?.HoraDefuncion || '',
	Foto: d?.Foto || null,
	Trabajos: d?.Trabajos || [],
});

export const PatientFormBase: React.FC<PatientFormBaseProps> = ({
	onSubmit,
	initialData,
	isEditing = false,
	isSubmitting,
	onClose,
}) => {
	const [formData, setFormData] = useState<PatientFormData>(() =>
		buildInitialFormData(initialData),
	);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [activeTab, setActiveTab] = useState<Tab>('personal');
	const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
		left: 0,
		width: 0,
	});
	const [sexoOptions, setSexoOptions] = useState<Sexo[]>([]);
	const [localidadOptions, setLocalidadOptions] = useState<Localidad[]>([]);
	const [selectedLocalidad, setSelectedLocalidad] = useState<Localidad | null>(null);
	const [loading, setLoading] = useState<{ localidad: boolean; sexo: boolean }>({
		localidad: false,
		sexo: false,
	});
	const [fotoFile, setFotoFile] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);
	const [isPhotoUploading, setIsPhotoUploading] = useState(false);
	const [internalSubmitting, setInternalSubmitting] = useState(false);
	const [buscandoRenaper, setBuscandoRenaper] = useState(false);

	const tabsRef = useRef<HTMLDivElement[]>([]);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const nodeRef = useRef<HTMLDivElement | null>(null);

	const fetchSexos = async () => {
		try {
			setLoading((p) => ({ ...p, sexo: true }));
			const data = await sexoService.getSexos();
			setSexoOptions(data);
		} catch (e) {
			console.error('Error sexos', e);
		} finally {
			setLoading((p) => ({ ...p, sexo: false }));
		}
	};

	const fetchLocalidades = async () => {
		try {
			setLoading((p) => ({ ...p, localidad: true }));
			const data = await localidadService.getLocalidades();
			setLocalidadOptions(data);
		} catch (e) {
			console.error('Error localidades', e);
		} finally {
			setLoading((p) => ({ ...p, localidad: false }));
		}
	};

	const handleGetProvincia = async (valorProvincia: string) => {
		try {
			const provincia = await provinciaService.getProvincia(valorProvincia);
			const provinciaData = Array.isArray(provincia) ? provincia[0] : provincia;
			setFormData((prev) => ({
				...prev,
				Nacionalidad: provinciaData?.nacionalidad || prev.Nacionalidad || 'Argentina',
				Provincia: provinciaData?.descripcion || prev.Provincia || '',
			}));
		} catch (err) {
			console.error('Error al obtener provincia:', err);
		}
	};

	const getRenaperInfo = async (
		e: React.MouseEvent | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
		NumeroDocumento: number,
		SexoVal: string,
	) => {
		e.preventDefault();
		if (!NumeroDocumento || !SexoVal) return;
		setBuscandoRenaper(true);
		const sexoOpt = SexoVal === 'F' ? 1 : 2;
		try {
			const resp = await fetch(
				`http://localhost:5006/api/renaper/buscar-persona/${NumeroDocumento}/${sexoOpt}`,
			);
			const data = await resp.json();
			if (data?.persona) {
				const locResp = await fetch(
					`http://localhost:5006/api/localidad/search-by-localidad/${data.persona.ciudad}`,
				);
				const dataLocalidad = await locResp.json();
				await fetchLocalidades();
				setFormData((prev) => ({
					...prev,
					NumeroDocumento: String(data.persona.numeroDocumento || ''),
					ApellidoyNombre:
						`${data.persona.apellido}, ${data.persona.nombres}`.trim(),
					Domicilio: `${data.persona.calle || ''} ${
						data.persona.numero || ''
					}`.trim(),
					ValorLocalidad: dataLocalidad?.data?.Valor
						? String(dataLocalidad.data.Valor)
						: prev.ValorLocalidad,
					FechaNacimiento: data.persona.fechaNacimiento || prev.FechaNacimiento,
					Sexo: data.persona.sexo || prev.Sexo,
				}));
				if (dataLocalidad?.data?.ValorProvincia) {
					await handleGetProvincia(String(dataLocalidad.data.ValorProvincia));
				}
			}
		} catch (err) {
			console.error('Error Renaper:', err);
		} finally {
			setBuscandoRenaper(false);
		}
	};

	const handleChange = async (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value } = e.target;
		// Localidad -> provincia
		if (name === 'ValorLocalidad') {
			const selected = localidadOptions.find(
				(l) => String(l.Valor).trim() === value.trim(),
			);
			setSelectedLocalidad(selected || null);
			if (selected?.ValorProvincia) await handleGetProvincia(selected.ValorProvincia);
		}
		let nextValue: any = value;
		if (name === 'OrdenNacimiento')
			nextValue = value === '' ? '' : isNaN(Number(value)) ? value : Number(value);
		if (name === 'DadorOrganos')
			nextValue = value === 'SI' ? 'SI' : value === 'NO' ? 'NO' : value;
		setFormData((prev) => ({ ...prev, [name]: nextValue }));
		if (errors[name]) {
			setErrors((prev) => {
				const n = { ...prev };
				delete n[name];
				return n;
			});
		}
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};
		if (!formData.ApellidoyNombre.trim())
			newErrors.ApellidoyNombre = 'El nombre y apellido es obligatorio';
		if (!formData.NumeroDocumento.trim())
			newErrors.NumeroDocumento = 'El número de documento es obligatorio';
		{
		}

		if (formData.FechaNacimiento) {
			const birth = new Date(formData.FechaNacimiento);
			if (birth > new Date()) newErrors.FechaNacimiento = 'No puede ser futura';
		}
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (internalSubmitting) return;
		if (!validateForm()) return;
		try {
			setInternalSubmitting(true);
			const payload: any = { ...formData };
			// Normalizar código de idioma indeterminado
			if (payload.Idioma === 'und') payload.Idioma = '';
			// Normalizar campo Idioma -> IdiomaPrimario para backend si corresponde
			if (payload.Idioma && !payload.IdiomaPrimario) {
				payload.IdiomaPrimario = payload.Idioma;
			}
			if (fotoFile) payload._fotoFile = fotoFile;
			console.log('[PatientFormBase] Enviando payload', payload);
			const success = await onSubmit(payload);
			if (success) onClose();
		} catch (err) {
			console.error('Error submit:', err);
		} finally {
			setInternalSubmitting(false);
		}
	};

	// Normalizar clarion date si llega numérica (una sola vez al montar)
	useEffect(() => {
		const val = formData.FechaNacimiento;
		if (!val) return;
		if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return;
		if (!/^\d+$/.test(val)) return;
		const date = clarionDateToDate(val);
		if (!date) return;
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		setFormData((prev) => ({ ...prev, FechaNacimiento: `${y}-${m}-${d}` }));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Cargar catálogos base
	useEffect(() => {
		fetchSexos();
		fetchLocalidades();
	}, []);

	// Sincronizar cuando initialData (paciente a editar) llega asincrónicamente
	useEffect(() => {
		if (isEditing && initialData) {
			setFormData((prev) => {
				// Si no hay paciente previo cargado o cambió el ID
				if (!prev.IDPaciente || prev.IDPaciente !== initialData.IDPaciente) {
					return buildInitialFormData(initialData);
				}
				return prev; // evita sobreescribir cambios del usuario
			});
		}
	}, [initialData, isEditing]);

	// Indicador tabs
	useEffect(() => {
		const ids: Tab[] = ['personal', 'other', 'laboral'];
		const idx = ids.indexOf(activeTab);
		const node = tabsRef.current[idx];
		if (node) setIndicatorStyle({ left: node.offsetLeft, width: node.offsetWidth });
	}, [activeTab]);

	return (
		<form
			id='patient-create-form'
			onSubmit={handleSubmit}
			className={styles.form}
			style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
		>
			<div className={'modalFullCenterWrapper ' + styles.modalContainer}>
				<HeaderAddPatient
					formData={formData}
					handleChange={handleChange}
					errors={errors}
					tiposDocumento={tiposDocumento}
					getRenaperInfo={getRenaperInfo}
					buscandoRenaper={buscandoRenaper}
					onPhotoChange={(file: File | null) => {
						setFotoFile(file);
						if (file) {
							const objectUrl = URL.createObjectURL(file);
							setPhotoPreview(objectUrl);
							setFormData((prev) => ({ ...prev, Foto: objectUrl }));
						} else {
							setPhotoPreview(null);
							setFormData((prev) => ({ ...prev, Foto: null }));
						}
					}}
					setPhotoUploading={setIsPhotoUploading}
				/>

				<div className={styles.tabsContainer}>
					<div
						ref={(el) => {
							if (el) tabsRef.current[0] = el;
						}}
						className={`${styles.tab} ${
							activeTab === 'personal' ? styles.tabActive : ''
						}`}
						onClick={() => setActiveTab('personal')}
					>
						Datos Personales y Contacto
					</div>
					<div
						ref={(el) => {
							if (el) tabsRef.current[1] = el;
						}}
						className={`${styles.tab} ${
							activeTab === 'other' ? styles.tabActive : ''
						}`}
						onClick={() => setActiveTab('other')}
					>
						Otros Datos
					</div>
					<div
						ref={(el) => {
							if (el) tabsRef.current[2] = el;
						}}
						className={`${styles.tab} ${
							activeTab === 'laboral' ? styles.tabActive : ''
						}`}
						onClick={() => setActiveTab('laboral')}
					>
						Datos Laborales
					</div>
					<div className={styles.indicator} style={indicatorStyle} />
				</div>

				<div ref={containerRef} className={styles.tabContentContainer}>
					<SwitchTransition mode='out-in'>
						<CSSTransition
							key={activeTab}
							nodeRef={nodeRef}
							timeout={300}
							classNames={{
								enter: styles['fade-slide-enter'],
								enterActive: styles['fade-slide-enter-active'],
								exit: styles['fade-slide-exit'],
								exitActive: styles['fade-slide-exit-active'],
							}}
							unmountOnExit
							onEnter={() => {
								if (containerRef.current)
									containerRef.current.style.height = '0px';
							}}
							onEntering={() => {
								if (containerRef.current && nodeRef.current)
									containerRef.current.style.height = `${nodeRef.current.scrollHeight}px`;
							}}
							onExit={() => {
								if (containerRef.current && nodeRef.current)
									containerRef.current.style.height = `${nodeRef.current.scrollHeight}px`;
							}}
						>
							<div ref={nodeRef}>
								{activeTab === 'personal' && (
									<PersonalDataTab
										formData={formData}
										errors={errors}
										handleChange={handleChange}
										localidadOptions={localidadOptions}
										loading={loading}
										sexoOptions={sexoOptions}
										estadosCiviles={estadosCiviles}
									/>
								)}
								{activeTab === 'other' && (
									<OtherDataTab
										formData={formData}
										handleChange={handleChange}
										errors={errors}
									/>
								)}
								{activeTab === 'laboral' && (
									<LaboralDataTab
										formData={formData}
										setFormData={setFormData}
									/>
								)}
							</div>
						</CSSTransition>
					</SwitchTransition>
				</div>

				<div className={styles.buttonContainer}>
					<button
						type='button'
						onClick={onClose}
						className={styles.cancelButton}
						disabled={internalSubmitting}
					>
						Cancelar
					</button>
					<button
						type='submit'
						className={`${styles.submitButton} ${
							internalSubmitting ? styles.loading : ''
						}`}
						disabled={internalSubmitting || isPhotoUploading}
					>
						{internalSubmitting && (
							<span className={styles.inlineSpinner} aria-hidden='true' />
						)}
						{internalSubmitting
							? 'Guardando...'
							: isEditing
							? 'Actualizar'
							: 'Guardar'}
					</button>
				</div>
			</div>
		</form>
	);
};

export default PatientFormBase;
