import { useState, useEffect, useRef } from 'react';
import { Patient, PatientFormData } from '../../types/PatientInterface';
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

interface PatientFormBaseProps {
	onSubmit: (data: PatientFormData) => Promise<boolean>;
	initialData?: Partial<PatientFormData>;
	isEditing?: boolean;
	onClose: () => void;
	isSubmitting: boolean;
}

type Tab = 'personal' | 'other' | 'laboral';

export const PatientFormBase: React.FC<PatientFormBaseProps> = ({
	onSubmit,
	initialData = {},
	isEditing = false,
	isSubmitting,
	onClose,
}) => {
	const [formData, setFormData] = useState<PatientFormData>({
		IDPaciente: initialData.IDPaciente || undefined,
		NumeroHC: initialData.NumeroHC || '',
		TipoDocumento: initialData.TipoDocumento || 'DNI',
		NumeroDocumento: initialData.NumeroDocumento || '',
		ApellidoyNombre: initialData.ApellidoyNombre || '',
		Domicilio: initialData.Domicilio || '',
		ValorLocalidad: initialData.ValorLocalidad || '',
		Provincia: initialData.Provincia || '',
		Nacionalidad: initialData.Nacionalidad || 'Argentina',
		FechaNacimiento: initialData.FechaNacimiento || '',
		CUIT: initialData.CUIT || '',
		Sexo: initialData.Sexo || 'M',
		EstadoCivil: initialData.EstadoCivil || 'SOLTERO',
		TelefonoParticular: initialData.TelefonoParticular || '',
		TelefonoNegocio: initialData.TelefonoNegocio || '',
		Mail: initialData.Mail || '',
		NumeroCuenta: initialData.NumeroCuenta || '',
		NumeroSSN: initialData.NumeroSSN || '',
	});
	const [activeTab, setActiveTab] = useState<Tab>('personal');
	const containerRef = useRef<HTMLDivElement>(null);
	const nodeRef = useRef<HTMLDivElement>(null);
	const tabsRef = useRef<(HTMLDivElement | null)[]>([]);
	const [indicatorStyle, setIndicatorStyle] = useState({});
	const [isPhotoUploading, setIsPhotoUploading] = useState(false);
	const [sexoOptions, setSexoOptions] = useState<Sexo[]>([]);
	const [localidadOptions, setLocalidadOptions] = useState<Localidad[]>([]);
	const [selectedLocalidad, setSelectedLocalidad] = useState<Localidad | null>(null);
	const tiposDocumento = [
		{ value: 'DNI', label: 'DNI' },
		{ value: 'LC', label: 'LC' },
		{ value: 'LE', label: 'LE' },
		{ value: 'PASAPORTE', label: 'Pasaporte' },
		{ value: 'OTRO', label: 'Otro' },
	];

	// Estado civil options
	const estadosCiviles = [
		{ value: 'S', label: 'Soltero/a' },
		{ value: 'C', label: 'Casado/a' },
		{ value: 'D', label: 'Divorciado/a' },
		{ value: 'V', label: 'Viudo/a' },
		{ value: 'O', label: 'Otro' },
	];

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState({
		sexo: false,
		localidad: false,
	});

	// Funciones para cargar datos
	const fetchSexos = async () => {
		try {
			setLoading((prev) => ({ ...prev, sexo: true }));
			const data = await sexoService.getSexos();
			// Asegurar que el valor actual coincida con alguna opción
			const validSexo = data.some((sexo) => sexo.valor === formData.Sexo);
			if (!validSexo) {
				setFormData((prev) => ({ ...prev, Sexo: data[0]?.valor || 'M' }));
			}
			setSexoOptions(data);
		} catch (error) {
			console.error('Error al cargar opciones de sexo:', error);
		} finally {
			setLoading((prev) => ({ ...prev, sexo: false }));
		}
	};

	const fetchLocalidades = async () => {
		try {
			setLoading((prev) => ({ ...prev, localidad: true }));
			const data = await localidadService.getLocalidades();
			setLocalidadOptions(data);
		} catch (error) {
			console.error('Error al cargar opciones de localidad:', error);
		} finally {
			setLoading((prev) => ({ ...prev, localidad: false }));
		}
	};

	const [buscandoRenaper, setBuscandoRenaper] = useState(false);
	const getRenaperInfo = async (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
		NumeroDocumento: number,
		Sexo: string,
	) => {
		e.preventDefault();
		setBuscandoRenaper(true);
		var sexoOpt = 2;
		if (Sexo == 'F') {
			sexoOpt = 1;
		}
		try {
			const resp = await fetch(
				`http://localhost:5006/api/renaper/buscar-persona/${NumeroDocumento}/${sexoOpt}`,
			);
			const data = await resp.json();
			console.log(data.persona);
			if (data.persona) {
				const localidad = await fetch(
					`http://localhost:5006/api/localidad/search-by-localidad/${data.persona.ciudad}`,
				);
				const dataLocalidad = await localidad.json();

				await fetchLocalidades();

				setFormData((prev) => ({
					...prev, // ✅ conserva Foto, Trabajos y otros
					IDPaciente: initialData.IDPaciente || undefined,
					NumeroHC: initialData.NumeroHC || '',
					TipoDocumento: initialData.TipoDocumento || 'DNI',
					NumeroDocumento: `${data.persona.numeroDocumento}`,
					ApellidoyNombre: `${data.persona.apellido}, ${data.persona.nombres}`,
					Domicilio: `${data.persona.calle} ${data.persona.numero}, ${data.persona.monoblock}`,
					ValorLocalidad: `${dataLocalidad.data.Valor}`,
					Provincia: initialData.Provincia || '',
					Nacionalidad: initialData.Nacionalidad || 'Argentina',
					FechaNacimiento: `${data.persona.fechaNacimiento}`,
					CUIT: initialData.CUIT || '',
					Sexo: `${data.persona.sexo}`,
					EstadoCivil: initialData.EstadoCivil || 'SOLTERO',
					TelefonoParticular: initialData.TelefonoParticular || '',
					TelefonoNegocio: initialData.TelefonoNegocio || '',
					Mail: initialData.Mail || '',
					NumeroCuenta: initialData.NumeroCuenta || '',
					NumeroSSN: initialData.NumeroSSN || '',
				}));

				await handleGetProvincia(dataLocalidad.data.ValorProvincia);
			}
		} catch (error) {
			console.error('Error al buscar información en Renaper:', error);
		} finally {
			setBuscandoRenaper(false);
		}
	};

	useEffect(() => {
		if (formData.FechaNacimiento && /^\d+$/.test(formData.FechaNacimiento)) {
			const date = clarionDateToDate(formData.FechaNacimiento);
			if (date) {
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				setFormData((prev) => ({
					...prev,
					FechaNacimiento: `${year}-${month}-${day}`,
				}));
			}
		}
	}, [formData.FechaNacimiento]);

	const handleGetProvincia = async (valorProvincia: string) => {
		const provincia = await provinciaService.getProvincia(valorProvincia);
		const provinciaData = Array.isArray(provincia) ? provincia[0] : provincia;

		setFormData((prev) => ({
			...prev,
			Nacionalidad: provinciaData?.nacionalidad || '',
			Provincia: provinciaData?.descripcion || '',
		}));
	};

	const handleChange = async (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value } = e.target;

		// Si cambia localidad, resuelve provincia
		if (name === 'ValorLocalidad') {
			const selected = localidadOptions.find(
				(l) => String(l.Valor).trim() === value.trim(),
			);
			setSelectedLocalidad(selected || null);
			if (selected?.ValorProvincia) {
				try {
					await handleGetProvincia(selected.ValorProvincia);
				} catch (error) {
					console.error('Error al obtener provincia:', error);
				}
			}
		}

		// Coerciones ligeras
		let nextValue: any = value;

		// Campos numéricos opcionales
		if (name === 'OrdenNacimiento') {
			nextValue = value === '' ? '' : isNaN(Number(value)) ? value : Number(value);
		}
		if (name === 'Raza' || name === 'ValorLocalidad') {
			nextValue = value; // si tu backend los quiere como string, deja así
		}

		// Boolean-like (si decides guardar "SI"/"NO" o "true"/"false", ajusta aquí)
		if (name === 'DadorOrganos') {
			// ejemplo: normalizar a "SI"/"NO"
			nextValue =
				value === 'SI' || value === 'true'
					? 'SI'
					: value === 'NO' || value === 'false'
					? 'NO'
					: value;
		}

		setFormData((prev) => ({ ...prev, [name]: nextValue }));

		// limpiar error del campo editado
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

		if (!formData.ApellidoyNombre.trim()) {
			newErrors.ApellidoyNombre = 'El nombre y apellido es obligatorio';
		}

		if (!formData.NumeroHC.trim()) {
			newErrors.NumeroHC = 'El número de historia clínica es obligatorio';
		} else if (!/^\d+$/.test(formData.NumeroHC)) {
			newErrors.NumeroHC = 'El número de historia clínica debe contener solo números';
		}

		if (formData.FechaNacimiento) {
			const today = new Date();
			const birthDate = new Date(formData.FechaNacimiento);
			if (birthDate > today) {
				newErrors.FechaNacimiento = 'La fecha de nacimiento no puede ser futura';
			}
		}

		if (!formData.Trabajos || formData.Trabajos.length === 0) {
			newErrors.Trabajos = 'Debe cargar al menos un empleo';
		}

		if (!formData.Foto) {
			newErrors.Foto = 'La foto es obligatoria';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) return;

		try {
			const success = await onSubmit(formData);
			if (success) {
				onClose();
			}
		} catch (error) {
			console.error('Error al guardar el paciente:', error);
		}
	};

	useEffect(() => {
		if (!initialData) return;

		setFormData((prev) => ({
			...prev,
			IDPaciente: initialData.IDPaciente || undefined,
			NumeroHC: initialData.NumeroHC || '',
			TipoDocumento: initialData.TipoDocumento || 'DNI',
			NumeroDocumento: initialData.NumeroDocumento || '',
			ApellidoyNombre: initialData.ApellidoyNombre || '',
			Domicilio: initialData.Domicilio || '',
			ValorLocalidad: initialData.ValorLocalidad || '',
			Provincia: initialData.Provincia || '',
			Nacionalidad: initialData.Nacionalidad || 'Argentina',
			FechaNacimiento: initialData.FechaNacimiento || '',
			CUIT: initialData.CUIT || '',
			Sexo: initialData.Sexo || 'M',
			EstadoCivil: initialData.EstadoCivil || 'SOLTERO',
			TelefonoParticular: initialData.TelefonoParticular || '',
			TelefonoNegocio: initialData.TelefonoNegocio || '',
			Mail: initialData.Mail || '',
			NumeroCuenta: initialData.NumeroCuenta || '',
			NumeroSSN: initialData.NumeroSSN || '',

			// Otros
			Raza: initialData.Raza ?? prev.Raza ?? '',
			Idioma: initialData.Idioma ?? prev.Idioma ?? '',
			Religion: initialData.Religion ?? prev.Religion ?? '',
			GrupoEtnico: initialData.GrupoEtnico ?? prev.GrupoEtnico ?? '',
			EstadoMilitar: initialData.EstadoMilitar ?? prev.EstadoMilitar ?? '',
			LicenciaConducir: initialData.LicenciaConducir ?? prev.LicenciaConducir ?? '',
			DadorOrganos: initialData.DadorOrganos ?? prev.DadorOrganos ?? '',
			OrdenNacimiento: initialData.OrdenNacimiento ?? prev.OrdenNacimiento ?? '',
			LugarNacimiento: initialData.LugarNacimiento ?? prev.LugarNacimiento ?? '',
			FechaDefuncion: initialData.FechaDefuncion ?? prev.FechaDefuncion ?? '',
			HoraDefuncion: initialData.HoraDefuncion ?? prev.HoraDefuncion ?? '',
			Foto: initialData.Foto ?? prev.Foto ?? null,

			// Laboral
			Trabajos: initialData.Trabajos ?? prev.Trabajos ?? [],
		}));

		if (initialData.Provincia) {
			handleGetProvincia(initialData.Provincia);
		}
		fetchLocalidades();
		fetchSexos();
	}, [initialData]);

	useEffect(() => {
		const tabIds: Tab[] = ['personal', 'other', 'laboral'];
		const activeIndex = tabIds.indexOf(activeTab);
		const activeTabNode = tabsRef.current[activeIndex];

		if (activeTabNode) {
			setIndicatorStyle({
				left: activeTabNode.offsetLeft,
				width: activeTabNode.offsetWidth,
			});
		}
	}, [activeTab]);

	return (
		<form onSubmit={handleSubmit} className={styles.form}>
			<div className={styles.modalContainer}>
				{/* Header con datos de identificación */}
				<HeaderAddPatient
					formData={formData}
					handleChange={handleChange}
					errors={errors}
					tiposDocumento={tiposDocumento}
					getRenaperInfo={getRenaperInfo}
					buscandoRenaper={buscandoRenaper}
					onPhotoChange={(url) => setFormData((prev) => ({ ...prev, Foto: url }))}
					setPhotoUploading={setIsPhotoUploading}
				/>
				{/* Título de la sección */}
				<div className={styles.tabsContainer}>
					<div
						ref={(el) => {
							tabsRef.current[0] = el;
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
							tabsRef.current[1] = el;
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
							tabsRef.current[2] = el;
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
							nodeRef={nodeRef} // Usamos la ref para el nodo
							timeout={300}
							classNames={{
								enter: styles['fade-slide-enter'],
								enterActive: styles['fade-slide-enter-active'],
								exit: styles['fade-slide-exit'],
								exitActive: styles['fade-slide-exit-active'],
							}}
							unmountOnExit
							// --- CORRECCIÓN: Funciones sin argumentos que usan las refs ---
							onEnter={() => {
								// Antes de entrar, el contenedor tiene altura 0
								if (containerRef.current) {
									containerRef.current.style.height = '0px';
								}
							}}
							onEntering={() => {
								// Al entrar, se ajusta a la altura del nuevo contenido
								if (containerRef.current && nodeRef.current) {
									containerRef.current.style.height = `${nodeRef.current.scrollHeight}px`;
								}
							}}
							onExit={() => {
								// Al salir, se ajusta a la altura del contenido que se va
								if (containerRef.current && nodeRef.current) {
									containerRef.current.style.height = `${nodeRef.current.scrollHeight}px`;
								}
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
						disabled={isSubmitting}
					>
						Cancelar
					</button>
					<button
						type='submit'
						className={`${styles.submitButton} ${
							isSubmitting ? styles.loading : ''
						}`}
						disabled={isSubmitting || isPhotoUploading}
					>
						{isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
					</button>
				</div>
			</div>
		</form>
	);
};

export default PatientFormBase;
