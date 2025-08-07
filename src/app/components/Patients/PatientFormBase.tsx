import { useState, useEffect } from 'react';
import { Patient, PatientFormData } from '../../types/PatientInterface';
import { Sexo, sexoService } from '../../services/sexoService';
import { Localidad, localidadService } from '../../services/localidadService';
import { provinciaService } from '../../services/provinciaService';
import { clarionDateToDate } from '../../utils/dateUtils';
import styles from '../../components/modals/ModalAddPatient/styles.module.css';
import HeaderAddPatient from './AddPatient/HeaderAddPatient';
import PersonalDataTab from './AddPatient/PersonalDataTab';

interface PatientFormBaseProps {
	onSubmit: (data: PatientFormData) => Promise<boolean>;
	initialData?: Partial<PatientFormData>;
	isEditing?: boolean;
	onClose: () => void;
}

export const PatientFormBase: React.FC<PatientFormBaseProps> = ({
	onSubmit,
	initialData = {},
	isEditing = false,
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

	const [isSubmitting, setIsSubmitting] = useState(false);

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

		const resp = await fetch(
			`http://localhost:4000/api/renaper/buscar-persona/${NumeroDocumento}/${sexoOpt}`,
		);
		const data = await resp.json();
		console.log(data.persona);
		if (data.persona) {
			const localidad = await fetch(
				`http://localhost:4000/api/localidad/search-by-localidad/${data.persona.ciudad}`,
			);
			const dataLocalidad = await localidad.json();

			await fetchLocalidades();

			setFormData({
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
			});

			await handleGetProvincia(dataLocalidad.data.ValorProvincia);
		}

		setBuscandoRenaper(false);
	};

	// Si hay un paciente, cargamos sus datos en el formulario
	useEffect(() => {
		if (initialData) {
			setFormData({
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

			// Si hay valor de provincia, cargar la provincia
			if (initialData.Provincia) {
				handleGetProvincia(initialData.Provincia);
			}
			fetchLocalidades();
			fetchSexos();
		}
	}, [initialData]);

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
		formData.Nacionalidad = provinciaData?.nacionalidad || '';
		setFormData((prev) => ({
			...prev,
			Provincia: provinciaData?.descripcion || '',
		}));
	};

	const handleChange = async (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value } = e.target;
		console.log(name);
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

		setFormData((prev) => ({ ...prev, [name]: value }));

		// Limpiar errores al editar el campo
		if (errors[name]) {
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[name];
				return newErrors;
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

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) return;

		try {
			setIsSubmitting(true);
			const success = await onSubmit(formData);
			if (success) {
				onClose();
			}
		} catch (error) {
			console.error('Error al guardar el paciente:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	useEffect(() => {
		fetchSexos();
		fetchLocalidades();
	}, []);

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
				/>
				{/* Título de la sección */}
				<div className={styles.tabs}>
					<div className={`${styles.tab} ${styles.tabActive}`}>
						Datos Personales y Contacto
					</div>

					<div className={styles.tab}>Otros Datos</div>

					<div className={styles.tab}>Datos Laborales</div>
				</div>

				{/* Contenido del formulario Data personal */}
				<PersonalDataTab
					formData={formData}
					errors={errors}
					handleChange={handleChange}
					localidadOptions={localidadOptions}
					loading={loading}
					sexoOptions={sexoOptions}
					estadosCiviles={estadosCiviles}
					onClose={onClose}
					isSubmitting={isSubmitting}
					isEditing={isEditing}
				/>

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
						disabled={isSubmitting}
					>
						{isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
					</button>
				</div>
			</div>
		</form>
	);
};

export default PatientFormBase;
