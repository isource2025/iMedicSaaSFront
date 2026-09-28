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
import styles from './PatientFormBase.module.css';
import React, { useState, useEffect, useRef } from 'react';
import coberturaService, {
	type AfiliadoMatch,
	type CoberturaOption,
} from '../../services/coberturaService';
import SeleccionCoberturaModal from './AddPatient/SeleccionCoberturaModal';
import { apiService } from '../../services/axios';
import { patientService } from '../../services/patientService';
import type { PersonaResponse, LocalidadResponse, LocalidadData } from './typesForRenaper';
import { mapRenaperToPatientFields } from '@/app/utils/renaperMapper';
import { repararTextoUi } from '@/app/utils/repararTextoUi';

interface PatientFormBaseProps {
	onSubmit: (data: any) => Promise<boolean> | boolean;
	initialData?: Partial<Patient>;
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

const toStr = (v: any, def = '') =>
	v === undefined || v === null ? def : repararTextoUi(String(v));
const normalizeHora = (raw: any): string => {
	if (raw === undefined || raw === null) return '';
	const str = String(raw).trim();
	if (!str) return '';
	// Si ya viene en formato HH:MM
	if (/^\d{2}:\d{2}$/.test(str)) return str;
	// Si viene como HHMM (ej: 0935, 1533)
	if (/^\d{3,4}$/.test(str)) {
		const padded = str.padStart(4, '0');
		const h = padded.slice(0, 2);
		const m = padded.slice(2, 4);
		if (Number(h) < 24 && Number(m) < 60) return `${h}:${m}`;
	}
	// Si viene como número clarion (centésimas de segundo) grande, intentar convertir a HH:MM
	if (/^\d+$/.test(str) && str.length > 4) {
		const n = Number(str);
		if (!isNaN(n) && n > 0) {
			const totalSeconds = Math.floor(n / 100);
			const hours = Math.floor(totalSeconds / 3600);
			const minutes = Math.floor((totalSeconds % 3600) / 60);
			if (hours < 24)
				return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
		}
	}
	return str; // fallback sin tocar
};

const buildInitialFormData = (d?: Partial<PatientFormData>): PatientFormData => ({
	IDPaciente: d?.IDPaciente,
	NumeroHC: toStr(d?.NumeroHC),
	TipoDocumento: toStr(d?.TipoDocumento, 'DNI'),
	NumeroDocumento: toStr(d?.NumeroDocumento),
	ApellidoyNombre: toStr(d?.ApellidoyNombre),
	Domicilio: toStr(d?.Domicilio),
	ValorLocalidad: toStr(d?.ValorLocalidad),
	Provincia: toStr(d?.Provincia),
	Nacionalidad: toStr(d?.Nacionalidad, 'Argentina'),
	FechaNacimiento: toStr(d?.FechaNacimiento),
	CUIT: toStr(d?.CUIT),
	Sexo: toStr(d?.Sexo, 'M'),
	EstadoCivil: toStr(d?.EstadoCivil, 'SOLTERO'),
	TelefonoParticular: toStr(d?.TelefonoParticular),
	TelefonoCelular: toStr(d?.TelefonoCelular),
	Mail: toStr(d?.Mail),
	Cobertura: toStr(d?.Cobertura),
	nAfiliado: toStr(d?.nAfiliado),
	Hora: normalizeHora(d?.Hora),
	FotoURL: d?.FotoURL || null,
	Raza: toStr(d?.Raza),
	// Mapear posible campo backend IdiomaPrimario al alias Idioma
	Idioma: toStr(d?.Idioma || d?.IdiomaPrimario),
	Religion: toStr(d?.Religion),
	GrupoEtnico: toStr(d?.GrupoEtnico),
	EstadoMilitar: toStr(d?.EstadoMilitar),
	SituacionLaboral: toStr(d?.SituacionLaboral),
	NivelEstudios: toStr(d?.NivelEstudios || (d as any)?.NivelDeEstudios),
	LicenciaConducir: toStr(d?.LicenciaConducir),
	DadorOrganos: toStr(d?.DadorOrganos),
	OrdenNacimiento: d?.OrdenNacimiento ?? '',
	LugarNacimiento: toStr(d?.LugarNacimiento),
	FechaDefuncion: toStr(d?.FechaDefuncion),
	HoraDefuncion: normalizeHora(d?.HoraDefuncion),
	Ocupacion: d?.Ocupacion,
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
		buildInitialFormData(initialData as Partial<PatientFormData>),
	);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [activeTab, setActiveTab] = useState<Tab>('personal');
	const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
		left: 0,
		width: 0,
	});
	const [sexoOptions, setSexoOptions] = useState<Sexo[]>([]);
	const [localidadOptions, setLocalidadOptions] = useState<Localidad[]>([]);
	const [coberturaOptions, setCoberturaOptions] = useState<CoberturaOption[]>([]);
	const [matchesCobertura, setMatchesCobertura] = useState<AfiliadoMatch[]>([]);
	const [validandoAfiliado, setValidandoAfiliado] = useState(false);
	const [buscandoCoberturas, setBuscandoCoberturas] = useState(false);
	const [resultadoAfiliado, setResultadoAfiliado] = useState<{
		tipo: 'ok' | 'error' | 'info';
		texto: string;
	} | null>(null);
	const busquedaDocRef = useRef(0);
	const [estadosCiviles, setEstadosCiviles] = useState<{ value: string; label: string }[]>(
		[],
	);
	const [selectedLocalidad, setSelectedLocalidad] = useState<Localidad | null>(null);
	const [loading, setLoading] = useState<{
		localidad: boolean;
		sexo: boolean;
		cobertura: boolean;
		estadoCivil: boolean;
	}>({
		localidad: false,
		sexo: false,
		cobertura: false,
		estadoCivil: false,
	});
	const [fotoFile, setFotoFile] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);
	const [isPhotoUploading, setIsPhotoUploading] = useState(false);
	const [internalSubmitting, setInternalSubmitting] = useState(false);
	const [buscandoRenaper, setBuscandoRenaper] = useState(false);
	const [avisoDocumento, setAvisoDocumento] = useState('');

	const tabsRef = useRef<HTMLDivElement[]>([]);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const nodeRef = useRef<HTMLDivElement | null>(null);
	const autoProvinciaAppliedRef = useRef(false);

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
			const result = await localidadService.getLocalidades();
			setLocalidadOptions(result.data);
		} catch (e) {
			console.error('Error localidades', e);
		} finally {
			setLoading((p) => ({ ...p, localidad: false }));
		}
	};

	const fetchCoberturas = async () => {
		try {
			setLoading((p) => ({ ...p, cobertura: true }));
			const data = await coberturaService.getCoberturas();
			setCoberturaOptions(data);
		} catch (e) {
			console.error('Error coberturas', e);
		} finally {
			setLoading((p) => ({ ...p, cobertura: false }));
		}
	};

	const fetchEstadoCivil = async () => {
		try {
			setLoading((p) => ({ ...p, estadoCivil: true }));

			const { data } = await apiService.get<[{ valor: string; descripcion: string }]>(
				'/estados-civiles',
			);

			setEstadosCiviles(data.map((ec) => ({ value: ec.valor, label: ec.descripcion })));
		} catch (e) {
			console.error('Error estados civiles', e);
		} finally {
			setLoading((p) => ({ ...p, estadoCivil: false }));
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

	// util para normalizar nombre de ciudad
	const normalizeCity = (raw: string) =>
		String(raw || '')
			.replace(/_/g, ' ') // underscores -> espacios
			.replace(/\s+/g, ' ') // colapsa múltiple espacios
			.trim();

	// helper para pedir la localidad de forma segura
	async function safeFetchLocalidad(ciudad: string): Promise<LocalidadData | null> {
		const query = encodeURIComponent(normalizeCity(ciudad));
		try {
			const resp = await apiService.get<LocalidadResponse>(
				`/localidad/search-by-localidad/${query}`,
			);
			return resp.data?.data ?? null;
		} catch (e: any) {
			// si tu interceptor de axios mete el status:
			if ((e as any)?.status === 404) {
				console.warn('[Localidad] No encontrada:', ciudad);
				return null;
			}
			// fallback si el interceptor solo manda message:
			if (String(e?.message || '').includes('404')) {
				console.warn('[Localidad] No encontrada:', ciudad);
				return null;
			}
			console.warn('[Localidad] Error consultando:', e);
			return null; // no bloquees el flujo
		}
	}

	const getRenaperInfo = async (
		e: React.MouseEvent | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
		NumeroDocumento: number,
		SexoVal: string,
	) => {
		e.preventDefault();
		if (!NumeroDocumento) return;
		const busqueda = ++busquedaDocRef.current;
		const vigente = () => busqueda === busquedaDocRef.current;
		setBuscandoRenaper(true);
		setMatchesCobertura([]);
		setResultadoAfiliado(null);
		setBuscandoCoberturas(false);
		const sexoOpt = SexoVal === 'F' ? 1 : 2;

		try {
			// Paso 1: ficha local. RENAPER y obras sociales solo si ese documento no existe.
			setAvisoDocumento('Buscando en la base de pacientes…');
			try {
				const local = await patientService.buscarPacientePorDocumento(NumeroDocumento);
				if (!vigente()) return;
				if (local) {
					autoProvinciaAppliedRef.current = false;
					setFotoFile(null);
					setFormData(buildInitialFormData(local as Partial<PatientFormData>));
					setAvisoDocumento(
						'Este documento ya está registrado. Se cargaron los datos de la ficha.',
					);
					return;
				}
			} catch (localErr) {
				console.error('Error buscando paciente en la base:', localErr);
			}

			// Paso 3 (en segundo plano, con su propio loader): obras sociales que validan por documento
			void buscarCoberturasPorDocumento(String(NumeroDocumento), vigente);

			// Paso 2: RENAPER
			if (!SexoVal) {
				setAvisoDocumento('No está en la base. Seleccione el sexo para consultar RENAPER.');
				return;
			}
			setAvisoDocumento('No está en la base. Buscando en RENAPER…');
			let persona: Record<string, unknown> | null = null;
			try {
				const { data } = await apiService.get<PersonaResponse>(
					`/renaper/buscar-persona/${NumeroDocumento}/${sexoOpt}`,
				);
				persona = (data?.persona as Record<string, unknown>) || null;
			} catch (renaperErr) {
				console.error('Error Renaper:', renaperErr);
				if (vigente()) setAvisoDocumento('No está en la base. No se pudo consultar RENAPER.');
				return;
			}
			if (!vigente()) return;
			if (!persona) {
				setAvisoDocumento('No se encontró el documento en la base ni en RENAPER.');
				return;
			}

			const mapped = mapRenaperToPatientFields(persona);
			setFormData((prev) => ({
				...prev,
				IDPaciente: undefined,
				NumeroDocumento: mapped.NumeroDocumento || prev.NumeroDocumento,
				ApellidoyNombre: mapped.ApellidoyNombre || prev.ApellidoyNombre,
				Domicilio: mapped.Domicilio || prev.Domicilio,
				Provincia: mapped.Provincia || prev.Provincia,
				Nacionalidad: mapped.Nacionalidad || prev.Nacionalidad,
				CUIT: mapped.CUIT || prev.CUIT,
				FechaNacimiento: mapped.FechaNacimiento ?? prev.FechaNacimiento,
				Sexo: mapped.Sexo ?? prev.Sexo,
			}));
			setAvisoDocumento('Datos cargados desde RENAPER.');

			const ciudadNorm = normalizeCity(mapped.ciudadNorm);
			const dataLocalidad = ciudadNorm ? await safeFetchLocalidad(ciudadNorm) : null;
			if (!vigente()) return;
			if (dataLocalidad?.Valor) {
				setFormData((prev) => ({ ...prev, ValorLocalidad: String(dataLocalidad.Valor) }));
			}
			if (dataLocalidad?.ValorProvincia) {
				await handleGetProvincia(String(dataLocalidad.ValorProvincia));
			} else if (ciudadNorm) {
				setAvisoDocumento(
					`Datos cargados desde RENAPER. La localidad "${ciudadNorm}" no está en el catálogo: selecciónela manualmente.`,
				);
			}
		} catch (err) {
			console.error('Error en búsqueda por documento:', err);
		} finally {
			if (vigente()) setBuscandoRenaper(false);
		}
	};

	const motivoAfiliado = (razonSocial: string, motivo?: string) => {
		switch (motivo) {
			case 'no_configurado':
				return `La validación de ${razonSocial} no está configurada en el servidor.`;
			case 'timeout':
				return `${razonSocial} no respondió a tiempo. Intente nuevamente.`;
			case 'conectividad':
			case 'servidor':
			case 'respuesta_invalida':
			case 'desconocido':
				return `No se pudo consultar ${razonSocial}. Intente nuevamente.`;
			default:
				return `No figura activo en ${razonSocial}.`;
		}
	};

	const buscarCoberturasPorDocumento = async (documento: string, vigente: () => boolean) => {
		setBuscandoCoberturas(true);
		try {
			const r = await coberturaService.validarAfiliadoPorDocumento(documento);
			if (!vigente()) return;
			const activos = (r.matches || []).filter((m) => m.activo);
			if (activos.length === 1) {
				aplicarCobertura(activos[0], documento);
			} else if (activos.length > 1) {
				setMatchesCobertura(activos);
				setResultadoAfiliado({
					tipo: 'info',
					texto: `Activo en ${activos.length} obras sociales: seleccione una.`,
				});
			} else {
				const checks = r.checks || [];
				const fallidos = checks.filter(
					(c) => c.motivo && !['no_afiliado', 'inactivo'].includes(c.motivo),
				);
				setResultadoAfiliado({
					tipo: fallidos.length ? 'error' : 'info',
					texto: fallidos.length
						? fallidos.map((c) => motivoAfiliado(c.razonSocial, c.motivo)).join(' ')
						: checks.length
							? `No figura activo en ${checks.map((c) => c.razonSocial).join(', ')}.`
							: r.message || 'No hay obras sociales que validen por documento.',
				});
			}
		} catch (err) {
			console.warn('Validación de afiliado por documento:', err);
			if (vigente())
				setResultadoAfiliado({
					tipo: 'error',
					texto: 'No se pudo consultar las obras sociales.',
				});
		} finally {
			if (vigente()) setBuscandoCoberturas(false);
		}
	};

	const aplicarCobertura = (match: AfiliadoMatch, documento?: string) => {
		setFormData((prev) => ({
			...prev,
			Cobertura: String(match.valor),
			nAfiliado: match.nAfiliado || documento || prev.nAfiliado,
		}));
		setResultadoAfiliado({
			tipo: 'ok',
			texto: `El paciente está activo en ${match.razonSocial}.`,
		});
	};

	const validarAfiliadoEnCobertura = async () => {
		const cobertura = String(formData.Cobertura || '').trim();
		const nro = String(formData.nAfiliado || '').trim();
		if (!cobertura) return;
		if (!nro) {
			setResultadoAfiliado({
				tipo: 'info',
				texto: 'Cargue el número de afiliado para consultar la actividad en la obra social.',
			});
			return;
		}
		setValidandoAfiliado(true);
		setResultadoAfiliado(null);
		try {
			const r = await coberturaService.validarAfiliadoEnCobertura(cobertura, nro);
			if (r.activo) {
				setResultadoAfiliado({
					tipo: 'ok',
					texto: `El afiliado ${nro} está activo en ${r.razonSocial}${r.datos?.nombre ? ` (${r.datos.nombre})` : ''}.`,
				});
			} else {
				const estado = r.datos?.estado ? ` Estado informado: ${r.datos.estado}.` : '';
				setResultadoAfiliado({
					tipo: r.motivo === 'no_afiliado' || r.motivo === 'inactivo' ? 'info' : 'error',
					texto: `${motivoAfiliado(r.razonSocial, r.motivo)}${estado}`,
				});
			}
		} catch (err: any) {
			console.error('Error validando afiliado:', err);
			setResultadoAfiliado({
				tipo: 'error',
				texto: err?.response?.data?.error || 'No se pudo consultar la obra social',
			});
		} finally {
			setValidandoAfiliado(false);
		}
	};

	const handleChange = async (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value } = e.target;
		if (name === 'Cobertura' || name === 'nAfiliado') setResultadoAfiliado(null);
		if (!isEditing && name === 'NumeroDocumento') {
			busquedaDocRef.current++;
			setBuscandoRenaper(false);
			setBuscandoCoberturas(false);
			setAvisoDocumento('');
			setFormData((prev) => ({
				...prev,
				NumeroDocumento: value,
				IDPaciente: undefined,
			}));
			if (errors.NumeroDocumento) {
				setErrors((prev) => {
					const n = { ...prev };
					delete n.NumeroDocumento;
					return n;
				});
			}
			return;
		}
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
		const nombreVal = toStr(formData.ApellidoyNombre).trim();
		const docVal = toStr(formData.NumeroDocumento).trim();
		if (!nombreVal) newErrors.ApellidoyNombre = 'El nombre y apellido es obligatorio';
		if (!docVal) newErrors.NumeroDocumento = 'El número de documento es obligatorio';
		if (formData.FechaNacimiento) {
			const birth = new Date(toStr(formData.FechaNacimiento));
			if (!isNaN(birth.getTime()) && birth > new Date())
				newErrors.FechaNacimiento = 'No puede ser futura';
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
			// Normalizar idioma: si viene string vacía o 'UNDEFINED'/'undefined' => null
			if (payload.Idioma === 'und') payload.Idioma = '';
			if (
				payload.Idioma === undefined ||
				payload.Idioma === null ||
				payload.Idioma === '' ||
				/^undefined$/i.test(String(payload.Idioma))
			) {
				payload.Idioma = undefined;
				payload.IdiomaPrimario = undefined; // no enviar al backend para que quede NULL
			} else {
				// mapear a IdiomaPrimario si no está
				if (!payload.IdiomaPrimario) payload.IdiomaPrimario = payload.Idioma;
			}
			// GrupoEtnico: sólo eliminar si está vacío o 'undefined'; permitir códigos numéricos o string válidos
			if (
				payload.GrupoEtnico === '' ||
				payload.GrupoEtnico === null ||
				payload.GrupoEtnico === undefined ||
				/^undefined$/i.test(String(payload.GrupoEtnico))
			) {
				delete payload.GrupoEtnico;
			}
			if (fotoFile) payload._fotoFile = fotoFile;
			console.log('[PatientFormBase] Enviando payload', {
				GrupoEtnico_raw: formData.GrupoEtnico,
				GrupoEtnico_payload: payload.GrupoEtnico,
				Idioma_raw: formData.Idioma,
				IdiomaPrimario_payload: payload.IdiomaPrimario,
				payload,
			});
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
		fetchCoberturas();
		fetchEstadoCivil();
	}, []);

	// Al editar o al cargar una ficha local, resolver provincia si vino como código
	useEffect(() => {
		const provinciaEsCodigo = /^\d+$/.test(String(formData.Provincia || '').trim());
		if (
			autoProvinciaAppliedRef.current ||
			!formData.ValorLocalidad ||
			!localidadOptions.length ||
			(!isEditing && !provinciaEsCodigo)
		)
			return;
		const selected = localidadOptions.find(
			(l) => String(l.Valor).trim() === String(formData.ValorLocalidad).trim(),
		);
		if (selected?.ValorProvincia) {
			autoProvinciaAppliedRef.current = true;
			handleGetProvincia(String(selected.ValorProvincia));
		}
	}, [isEditing, formData.ValorLocalidad, formData.Provincia, localidadOptions]);

	// Sincronizar cuando initialData (paciente a editar) llega asincrónicamente
	useEffect(() => {
		if (isEditing && initialData) {
			setFormData((prev) => {
				// Si no hay paciente previo cargado o cambió el ID
				if (!prev.IDPaciente || prev.IDPaciente !== initialData.IDPaciente) {
					return buildInitialFormData(initialData as Partial<PatientFormData>);
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
		>
			<div className={'modalFullCenterWrapper ' + styles.modalContainer}>
				<HeaderAddPatient
					formData={formData}
					handleChange={handleChange}
					errors={errors}
					tiposDocumento={tiposDocumento}
					getRenaperInfo={getRenaperInfo}
					buscandoRenaper={buscandoRenaper}
					avisoDocumento={avisoDocumento}
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
										coberturaOptions={coberturaOptions}
										onValidarAfiliado={validarAfiliadoEnCobertura}
										validandoAfiliado={validandoAfiliado}
										buscandoCoberturas={buscandoCoberturas}
										resultadoAfiliado={resultadoAfiliado}
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
						tabIndex={20}
					>
						Cancelar
					</button>
					<button
						type='submit'
						className={`${styles.submitButton} ${
							internalSubmitting ? styles.loading : ''
						}`}
						disabled={internalSubmitting || isPhotoUploading || isSubmitting}
						tabIndex={21}
					>
						{internalSubmitting && (
							<span className={styles.inlineSpinner} aria-hidden='true' />
						)}
						{internalSubmitting
							? 'Guardando...'
							: isEditing || formData.IDPaciente
							? 'Actualizar'
							: 'Guardar'}
					</button>
				</div>
			</div>
			<SeleccionCoberturaModal
				matches={matchesCobertura}
				onSeleccionar={(m) => {
					aplicarCobertura(m, String(formData.NumeroDocumento || ''));
					setMatchesCobertura([]);
				}}
				onCancelar={() => setMatchesCobertura([])}
			/>
		</form>
	);
};

export default PatientFormBase;
