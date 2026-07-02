'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
	Personal,
	PersonalFormData,
	CatalogoItemNumerico,
	CatalogoItemTexto,
} from '../../types/personal';
import { Sexo, sexoService } from '../../services/sexoService';
import { Localidad, localidadService } from '../../services/localidadService';
import { provinciaService } from '../../services/provinciaService';
import { apiService } from '../../services/axios';
import { clarionDateToDate } from '../../utils/dateUtils';
import { personalService } from '../../services/personalService';
import type {
	PersonaResponse,
	LocalidadResponse,
	LocalidadData,
} from '../Patients/typesForRenaper';
import styles from './PersonalForm.module.css';
import { nacionalidadDescripcionACodigo } from '../../utils/nacionalidadCodigo';
import AgendaTab from './AgendaTab/AgendaTab';
import PersonalCuentaTab from './PersonalCuentaTab';
import { usePermiso } from '../../hooks/usePermiso';

interface EstadoCivil {
	valor: string;
	descripcion: string;
}

interface PersonalFormProps {
	personal?: Personal | null;
	isEditing?: boolean;
	isSubmitting?: boolean;
	onSubmit: (data: PersonalFormData) => Promise<boolean>;
	onCancel: () => void;
}

type Tab = 'personal' | 'profesional' | 'cuenta' | 'agenda';

const TIPOS_DOCUMENTO = [
	{ value: 'DNI', label: 'DNI' },
	{ value: 'LC', label: 'LC' },
	{ value: 'LE', label: 'LE' },
	{ value: 'PAS', label: 'PAS' },
];

const toStr = (v: any, def = '') => (v === undefined || v === null ? def : String(v));

const buildInitial = (d?: Partial<Personal> | null): PersonalFormData => ({
	Valor: d?.Valor,
	TipoDocumento: toStr(d?.TipoDocumento, 'DNI'),
	NumeroDocumento: toStr(d?.NumeroDocumento),
	ApellidoNombre: toStr(d?.ApellidoNombre),
	Domicilio: toStr(d?.Domicilio),
	ValorLocalidad: toStr(d?.ValorLocalidad),
	Provincia: toStr(d?.Provincia),
	Nacionalidad: toStr(d?.Nacionalidad, 'AR'),
	FechaNacimiento: toStr(d?.FechaNacimiento),
	Sexo: toStr(d?.Sexo, 'M'),
	EstadoCivil: toStr(d?.EstadoCivil, 'S'),
	Telefono: toStr(d?.Telefono),
	MatriculaProvincial: toStr(d?.MatriculaProvincial),
	MatriculaNacional: toStr(d?.MatriculaNacional),
	ValorEspecialidad: toStr(d?.ValorEspecialidad),
	ValorFunciones: toStr(d?.ValorFunciones),
	ValorCategoria: toStr(d?.ValorCategoria),
	ValorClase: toStr(d?.ValorClase),
	LugarTrabajo: toStr(d?.LugarTrabajo),
	LugarCobro: toStr(d?.LugarCobro),
	NumeroSocio: toStr(d?.NumeroSocio),
	ConvenioFacturacion: toStr(d?.ConvenioFacturacion),
	IdEspecialidadME: toStr(d?.IdEspecialidadME),
	CrearUsuario: !d?.Valor,
	NombreRed: '',
	Password: '',
	ConfirmPassword: '',
	CodOperador: '',
});

const normalizeCity = (raw: string) =>
	String(raw || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

export default function PersonalForm({
	personal,
	isEditing = false,
	isSubmitting = false,
	onSubmit,
	onCancel,
}: PersonalFormProps) {
	const [formData, setFormData] = useState<PersonalFormData>(() => buildInitial(personal));
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [activeTab, setActiveTab] = useState<Tab>('personal');
	const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
		left: 0,
		width: 0,
	});
	const [sexoOptions, setSexoOptions] = useState<Sexo[]>([]);
	const [localidadOptions, setLocalidadOptions] = useState<Localidad[]>([]);
	const [estadosCiviles, setEstadosCiviles] = useState<EstadoCivil[]>([]);
	const [especialidades, setEspecialidades] = useState<CatalogoItemNumerico[]>([]);
	const [funciones, setFunciones] = useState<CatalogoItemNumerico[]>([]);
	const [categorias, setCategorias] = useState<CatalogoItemNumerico[]>([]);
	const [clases, setClases] = useState<CatalogoItemTexto[]>([]);
	const [provinciaDesc, setProvinciaDesc] = useState<string>('');
	const [buscandoRenaper, setBuscandoRenaper] = useState(false);
	const [internalSubmitting, setInternalSubmitting] = useState(false);
	const [nextId, setNextId] = useState<number | null>(null);

	const tabsRef = useRef<HTMLDivElement[]>([]);
	const autoProvinciaAppliedRef = useRef(false);

	useEffect(() => {
		(async () => {
			try {
				setSexoOptions(await sexoService.getSexos());
			} catch (e) {
				console.error('sexos', e);
			}
		})();
		(async () => {
			try {
				const r = await localidadService.getLocalidades(1, 500, '');
				setLocalidadOptions(r.data);
			} catch (e) {
				console.error('localidades', e);
			}
		})();
		(async () => {
			try {
				const { data } = await apiService.get<EstadoCivil[]>('/estados-civiles');
				setEstadosCiviles(data || []);
			} catch (e) {
				console.error('estados civiles', e);
			}
		})();
		(async () => {
			try {
				const [esp, fn, cat, cl] = await Promise.all([
					personalService.getEspecialidades(),
					personalService.getFunciones(),
					personalService.getCategorias(),
					personalService.getClases(),
				]);
				setEspecialidades(esp);
				setFunciones(fn);
				setCategorias(cat);
				setClases(cl);
			} catch (e) {
				console.error('catalogos personal', e);
			}
		})();
	}, []);

	useEffect(() => {
		if (!isEditing) {
			(async () => {
				try {
					setNextId(await personalService.getNextId());
				} catch (e) {
					console.error('next id', e);
				}
			})();
		}
	}, [isEditing]);

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

	const { puedeSubmodulo, rol } = usePermiso();
	const esAdmin = String(rol?.nombre ?? '')
		.trim()
		.toUpperCase() === 'ADMIN';
	const puedeConfigurarAgenda = puedeSubmodulo('TURNOS', 'CONFIGURACION');
	const showAgendaTab =
		isEditing && (puedeConfigurarAgenda || esAdmin);
	const showCuentaTab = isEditing && !!formData.Valor;
	const matriculaProfesional = Number(formData.MatriculaProvincial) || null;

	const tabIds: Tab[] = ['personal', 'profesional'];
	if (showCuentaTab) tabIds.push('cuenta');
	if (showAgendaTab) tabIds.push('agenda');

	useEffect(() => {
		const idx = tabIds.indexOf(activeTab);
		const node = tabsRef.current[idx];
		if (node) setIndicatorStyle({ left: node.offsetLeft, width: node.offsetWidth });
	}, [activeTab, showAgendaTab, showCuentaTab]);

	const fetchProvincia = async (valorProvincia: string) => {
		try {
			const prov = await provinciaService.getProvincia(valorProvincia);
			const p = Array.isArray(prov) ? prov[0] : prov;
			setProvinciaDesc(p?.descripcion || '');
			setFormData((prev) => ({
				...prev,
				Provincia: valorProvincia,
				// imPersonal.Nacionalidad suele ser VARCHAR(2); la API devuelve descripción ("ARGENTINA").
				Nacionalidad: nacionalidadDescripcionACodigo(
					p?.nacionalidad || prev.Nacionalidad,
					prev.Nacionalidad || 'AR',
				),
			}));
		} catch (err) {
			console.error('Provincia error', err);
		}
	};

	useEffect(() => {
		if (
			!isEditing ||
			autoProvinciaAppliedRef.current ||
			!formData.ValorLocalidad ||
			!localidadOptions.length
		)
			return;
		const selected = localidadOptions.find(
			(l) => String(l.Valor).trim() === String(formData.ValorLocalidad).trim(),
		);
		if (selected?.ValorProvincia) {
			autoProvinciaAppliedRef.current = true;
			fetchProvincia(String(selected.ValorProvincia));
		}
	}, [isEditing, formData.ValorLocalidad, localidadOptions]);

	useEffect(() => {
		if (isEditing && personal) {
			setFormData((prev) => {
				if (!prev.Valor || prev.Valor !== personal.Valor) {
					return buildInitial(personal);
				}
				return prev;
			});
		}
	}, [personal, isEditing]);

	const handleChange = async (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value } = e.target;
		if (name === 'ValorLocalidad') {
			const sel = localidadOptions.find(
				(l) => String(l.Valor).trim() === value.trim(),
			);
			if (sel?.ValorProvincia) await fetchProvincia(String(sel.ValorProvincia));
		}
		setFormData((prev) => ({ ...prev, [name]: value }));
		if (errors[name]) {
			setErrors((prev) => {
				const n = { ...prev };
				delete n[name];
				return n;
			});
		}
	};

	async function safeFetchLocalidad(ciudad: string): Promise<LocalidadData | null> {
		const query = encodeURIComponent(normalizeCity(ciudad));
		try {
			const resp = await apiService.get<LocalidadResponse>(
				`/localidad/search-by-localidad/${query}`,
			);
			return resp.data?.data ?? null;
		} catch (e: any) {
			if ((e as any)?.status === 404) return null;
			if (String(e?.message || '').includes('404')) return null;
			console.warn('[Localidad] Error:', e);
			return null;
		}
	}

	const getRenaperInfo = async (e: React.MouseEvent) => {
		e.preventDefault();
		const numero = Number(formData.NumeroDocumento);
		const sexo = formData.Sexo;
		if (!numero || !sexo) {
			alert('Ingrese número de documento y sexo antes de consultar RENAPER');
			return;
		}
		setBuscandoRenaper(true);
		const sexoOpt = sexo === 'F' ? 1 : 2;
		try {
			const { data } = await apiService.get<PersonaResponse>(
				`/renaper/buscar-persona/${numero}/${sexoOpt}`,
			);
			if (data?.persona) {
				const ciudadNorm = normalizeCity(data.persona.ciudad || '');
				const dataLocalidad = ciudadNorm ? await safeFetchLocalidad(ciudadNorm) : null;

				setFormData((prev) => ({
					...prev,
					NumeroDocumento: String(data.persona!.numeroDocumento ?? ''),
					ApellidoNombre: `${data.persona!.apellido ?? ''}, ${data.persona!.nombres ?? ''}`
						.trim()
						.replaceAll(',', ''),
					Domicilio: `${data.persona!.calle ?? ''} ${data.persona!.numero ?? ''}`.trim(),
					ValorLocalidad: dataLocalidad?.Valor
						? String(dataLocalidad.Valor)
						: prev.ValorLocalidad,
					FechaNacimiento: data.persona!.fechaNacimiento ?? prev.FechaNacimiento,
					Sexo: data.persona!.sexo ?? prev.Sexo,
				}));

				if (dataLocalidad?.ValorProvincia) {
					await fetchProvincia(String(dataLocalidad.ValorProvincia));
				}
			} else {
				alert('No se encontraron datos en RENAPER');
			}
		} catch (err) {
			console.error('RENAPER error', err);
			alert('Error consultando RENAPER');
		} finally {
			setBuscandoRenaper(false);
		}
	};

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};
		if (!String(formData.ApellidoNombre).trim())
			newErrors.ApellidoNombre = 'El apellido y nombre es obligatorio';
		if (formData.NumeroDocumento && isNaN(Number(formData.NumeroDocumento)))
			newErrors.NumeroDocumento = 'DNI inválido';
		if (formData.FechaNacimiento) {
			const b = new Date(formData.FechaNacimiento);
			if (!isNaN(b.getTime()) && b > new Date())
				newErrors.FechaNacimiento = 'No puede ser futura';
		}
		if (formData.MatriculaProvincial && isNaN(Number(formData.MatriculaProvincial)))
			newErrors.MatriculaProvincial = 'Matrícula inválida';
		if (formData.MatriculaNacional && isNaN(Number(formData.MatriculaNacional)))
			newErrors.MatriculaNacional = 'Matrícula inválida';
		if (!isEditing && formData.CrearUsuario) {
			if (!String(formData.NombreRed || '').trim()) {
				newErrors.NombreRed = 'El nombre de usuario es obligatorio';
			}
			if (!formData.Password || formData.Password.length < 4) {
				newErrors.Password = 'La contraseña debe tener al menos 4 caracteres';
			}
			if (formData.Password !== formData.ConfirmPassword) {
				newErrors.ConfirmPassword = 'Las contraseñas no coinciden';
			}
		}
		setErrors(newErrors);
		if (Object.keys(newErrors).length > 0) {
			if (
				newErrors.ApellidoNombre ||
				newErrors.NumeroDocumento ||
				newErrors.FechaNacimiento
			) {
				setActiveTab('personal');
			} else if (newErrors.NombreRed || newErrors.Password || newErrors.ConfirmPassword) {
				setActiveTab('profesional');
			} else {
				setActiveTab('profesional');
			}
		}
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (internalSubmitting) return;
		if (!validate()) return;
		try {
			setInternalSubmitting(true);
			const payload: PersonalFormData = { ...formData };
			if (isEditing) {
				delete payload.CrearUsuario;
				delete payload.NombreRed;
				delete payload.Password;
				delete payload.ConfirmPassword;
				delete payload.CodOperador;
			} else if (!payload.CrearUsuario) {
				delete payload.NombreRed;
				delete payload.Password;
				delete payload.ConfirmPassword;
				delete payload.CodOperador;
			} else {
				delete payload.ConfirmPassword;
			}
			const ok = await onSubmit(payload);
			if (ok) onCancel();
		} finally {
			setInternalSubmitting(false);
		}
	};

	const displayId = isEditing
		? formData.Valor ?? ''
		: nextId != null
		? nextId
		: '';

	return (
		<form onSubmit={handleSubmit} className={styles.form} noValidate>
			<div className={styles.tabsContainer}>
				<div
					ref={(el) => {
						if (el) tabsRef.current[0] = el;
					}}
					className={`${styles.tab} ${activeTab === 'personal' ? styles.tabActive : ''}`}
					onClick={() => setActiveTab('personal')}
				>
					Datos Personales
				</div>
				<div
					ref={(el) => {
						if (el) tabsRef.current[1] = el;
					}}
					className={`${styles.tab} ${activeTab === 'profesional' ? styles.tabActive : ''}`}
					onClick={() => setActiveTab('profesional')}
				>
					Datos Profesionales
				</div>
				{showCuentaTab && (
					<div
						ref={(el) => {
							if (el) tabsRef.current[tabIds.indexOf('cuenta')] = el;
						}}
						className={`${styles.tab} ${activeTab === 'cuenta' ? styles.tabActive : ''}`}
						onClick={() => setActiveTab('cuenta')}
					>
						Cuenta de acceso
					</div>
				)}
				{showAgendaTab && (
					<div
						ref={(el) => {
							if (el) tabsRef.current[tabIds.indexOf('agenda')] = el;
						}}
						className={`${styles.tab} ${activeTab === 'agenda' ? styles.tabActive : ''}`}
						onClick={() => setActiveTab('agenda')}
					>
						Agenda
					</div>
				)}
				<div className={styles.indicator} style={indicatorStyle} />
			</div>

			<div className={styles.tabPanel}>
			{activeTab === 'personal' && (
				<div className={styles.grid}>
					<div className={`${styles.field} ${styles.fieldId}`}>
						<label className={styles.label}>ID</label>
						<input
							type='text'
							value={displayId}
							readOnly
							disabled
							className={`${styles.input} ${styles.readOnly}`}
							tabIndex={-1}
						/>
					</div>

					<div className={`${styles.field} ${styles.fieldTipoDoc}`}>
						<label className={styles.label}>Tipo Doc.</label>
						<select
							name='TipoDocumento'
							value={formData.TipoDocumento}
							onChange={handleChange}
							className={styles.input}
							tabIndex={1}
						>
							{TIPOS_DOCUMENTO.map((t) => (
								<option key={t.value} value={t.value}>
									{t.label}
								</option>
							))}
						</select>
					</div>

					<div className={`${styles.field} ${styles.fieldDni}`}>
						<label className={styles.label}>DNI *</label>
						<div className={styles.inputWithButton}>
							<input
								type='text'
								name='NumeroDocumento'
								value={formData.NumeroDocumento}
								onChange={handleChange}
								className={styles.input}
								tabIndex={2}
								inputMode='numeric'
							/>
							<button
								type='button'
								onClick={getRenaperInfo}
								className={styles.renaperButton}
								disabled={buscandoRenaper}
								title='Buscar en RENAPER'
								tabIndex={3}
							>
								{buscandoRenaper ? '...' : 'RENAPER'}
							</button>
						</div>
						{errors.NumeroDocumento && (
							<span className={styles.error}>{errors.NumeroDocumento}</span>
						)}
					</div>

					<div className={`${styles.field} ${styles.fieldNombre}`}>
						<label className={styles.label}>Apellido y Nombre *</label>
						<input
							type='text'
							name='ApellidoNombre'
							value={formData.ApellidoNombre}
							onChange={handleChange}
							className={`${styles.input} ${errors.ApellidoNombre ? styles.inputError : ''}`}
							tabIndex={4}
						/>
						{errors.ApellidoNombre && (
							<span className={styles.error}>{errors.ApellidoNombre}</span>
						)}
					</div>

					<div className={`${styles.field} ${styles.fieldDomicilio}`}>
						<label className={styles.label}>Domicilio</label>
						<input
							type='text'
							name='Domicilio'
							value={formData.Domicilio}
							onChange={handleChange}
							className={styles.input}
							tabIndex={5}
						/>
					</div>

					<div className={`${styles.field} ${styles.fieldLocalidad}`}>
						<label className={styles.label}>Localidad</label>
						<select
							name='ValorLocalidad'
							value={formData.ValorLocalidad}
							onChange={handleChange}
							className={styles.input}
							tabIndex={6}
						>
							<option value=''>- Seleccionar -</option>
							{localidadOptions.map((l) => (
								<option key={l.Valor} value={l.Valor}>
									{l.NombreLocalidad}
								</option>
							))}
						</select>
					</div>

					<div className={`${styles.field} ${styles.fieldProvincia}`}>
						<label className={styles.label}>Provincia</label>
						<input
							type='text'
							value={provinciaDesc || formData.Provincia}
							readOnly
							disabled
							className={`${styles.input} ${styles.readOnly}`}
							tabIndex={-1}
						/>
					</div>

					<div className={`${styles.field} ${styles.fieldNacionalidad}`}>
						<label className={styles.label}>Nacionalidad</label>
						<input
							type='text'
							name='Nacionalidad'
							value={formData.Nacionalidad}
							onChange={handleChange}
							className={styles.input}
							tabIndex={7}
						/>
					</div>

					<div className={`${styles.field} ${styles.fieldFechaNac}`}>
						<label className={styles.label}>Fecha Nacimiento</label>
						<input
							type='date'
							name='FechaNacimiento'
							value={formData.FechaNacimiento}
							onChange={handleChange}
							className={`${styles.input} ${errors.FechaNacimiento ? styles.inputError : ''}`}
							tabIndex={8}
						/>
						{errors.FechaNacimiento && (
							<span className={styles.error}>{errors.FechaNacimiento}</span>
						)}
					</div>

					<div className={`${styles.field} ${styles.fieldSexo}`}>
						<label className={styles.label}>Sexo</label>
						<select
							name='Sexo'
							value={formData.Sexo}
							onChange={handleChange}
							className={styles.input}
							tabIndex={9}
						>
							{sexoOptions.length === 0 && (
								<>
									<option value='M'>Masculino</option>
									<option value='F'>Femenino</option>
								</>
							)}
							{sexoOptions.map((s) => (
								<option key={s.valor} value={s.valor}>
									{s.descripcion}
								</option>
							))}
						</select>
					</div>

					<div className={`${styles.field} ${styles.fieldEstadoCivil}`}>
						<label className={styles.label}>Estado Civil</label>
						<select
							name='EstadoCivil'
							value={formData.EstadoCivil}
							onChange={handleChange}
							className={styles.input}
							tabIndex={10}
						>
							<option value=''>- Seleccionar -</option>
							{estadosCiviles.map((ec) => (
								<option key={ec.valor} value={ec.valor}>
									{ec.descripcion}
								</option>
							))}
						</select>
					</div>

					<div className={`${styles.field} ${styles.fieldTelefono}`}>
						<label className={styles.label}>Teléfono</label>
						<input
							type='text'
							name='Telefono'
							value={formData.Telefono}
							onChange={handleChange}
							className={styles.input}
							tabIndex={11}
						/>
					</div>
				</div>
			)}

			{activeTab === 'profesional' && (
				<div className={styles.grid}>
					<div className={`${styles.field} ${styles.fieldHalf}`}>
						<label className={styles.label}>Matrícula Provincial</label>
						<input
							type='text'
							name='MatriculaProvincial'
							value={formData.MatriculaProvincial}
							onChange={handleChange}
							className={`${styles.input} ${errors.MatriculaProvincial ? styles.inputError : ''}`}
							inputMode='numeric'
							tabIndex={30}
						/>
						{errors.MatriculaProvincial && (
							<span className={styles.error}>{errors.MatriculaProvincial}</span>
						)}
					</div>

					<div className={`${styles.field} ${styles.fieldHalf}`}>
						<label className={styles.label}>Matrícula Nacional</label>
						<input
							type='text'
							name='MatriculaNacional'
							value={formData.MatriculaNacional}
							onChange={handleChange}
							className={`${styles.input} ${errors.MatriculaNacional ? styles.inputError : ''}`}
							inputMode='numeric'
							tabIndex={31}
						/>
						{errors.MatriculaNacional && (
							<span className={styles.error}>{errors.MatriculaNacional}</span>
						)}
					</div>

					<div className={`${styles.field} ${styles.fieldHalf}`}>
						<label className={styles.label}>Especialidad</label>
						<select
							name='ValorEspecialidad'
							value={formData.ValorEspecialidad}
							onChange={handleChange}
							className={styles.input}
							tabIndex={32}
						>
							<option value=''>- Seleccionar -</option>
							{especialidades.map((o) => (
								<option key={o.valor} value={o.valor}>
									{o.descripcion}
								</option>
							))}
						</select>
					</div>

					<div className={`${styles.field} ${styles.fieldHalf}`}>
						<label className={styles.label}>Función</label>
						<select
							name='ValorFunciones'
							value={formData.ValorFunciones}
							onChange={handleChange}
							className={styles.input}
							tabIndex={33}
						>
							<option value=''>- Seleccionar -</option>
							{funciones.map((o) => (
								<option key={o.valor} value={o.valor}>
									{o.descripcion}
								</option>
							))}
						</select>
					</div>

					<div className={`${styles.field} ${styles.fieldHalf}`}>
						<label className={styles.label}>Categoría</label>
						<select
							name='ValorCategoria'
							value={formData.ValorCategoria}
							onChange={handleChange}
							className={styles.input}
							tabIndex={35}
						>
							<option value=''>- Seleccionar -</option>
							{categorias.map((o) => (
								<option key={o.valor} value={o.valor}>
									{o.descripcion}
								</option>
							))}
						</select>
					</div>

					<div className={`${styles.field} ${styles.fieldHalf}`}>
						<label className={styles.label}>Clase</label>
						<select
							name='ValorClase'
							value={formData.ValorClase}
							onChange={handleChange}
							className={styles.input}
							tabIndex={36}
						>
							<option value=''>- Seleccionar -</option>
							{clases.map((o) => (
								<option key={o.valor} value={o.valor}>
									{o.descripcion}
								</option>
							))}
						</select>
					</div>

					<div className={`${styles.field} ${styles.fieldHalf}`}>
						<label className={styles.label}>Lugar de Trabajo</label>
						<input
							type='text'
							name='LugarTrabajo'
							value={formData.LugarTrabajo}
							onChange={handleChange}
							className={styles.input}
							maxLength={20}
							tabIndex={37}
						/>
					</div>

					<div className={`${styles.field} ${styles.fieldHalf}`}>
						<label className={styles.label}>Lugar de Cobro</label>
						<input
							type='text'
							name='LugarCobro'
							value={formData.LugarCobro}
							onChange={handleChange}
							className={styles.input}
							maxLength={20}
							tabIndex={38}
						/>
					</div>

					<div className={`${styles.field} ${styles.fieldHalf}`}>
						<label className={styles.label}>Número de Socio</label>
						<input
							type='text'
							name='NumeroSocio'
							value={formData.NumeroSocio}
							onChange={handleChange}
							className={styles.input}
							inputMode='numeric'
							tabIndex={39}
						/>
					</div>

					<div className={`${styles.field} ${styles.fieldHalf}`}>
						<label className={styles.label}>Convenio Facturación</label>
						<input
							type='text'
							name='ConvenioFacturacion'
							value={formData.ConvenioFacturacion}
							onChange={handleChange}
							className={styles.input}
							maxLength={10}
							tabIndex={40}
						/>
					</div>

					<div className={`${styles.field} ${styles.fieldHalf}`}>
						<label className={styles.label}>Id Especialidad ME</label>
						<input
							type='text'
							name='IdEspecialidadME'
							value={formData.IdEspecialidadME}
							onChange={handleChange}
							className={styles.input}
							inputMode='numeric'
							tabIndex={41}
						/>
					</div>

					{!isEditing && (
						<div className={styles.usuarioSection}>
							<div className={styles.usuarioHead}>
								<label className={styles.checkboxLabel}>
									<input
										type='checkbox'
										checked={!!formData.CrearUsuario}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												CrearUsuario: e.target.checked,
											}))
										}
									/>
									Crear usuario de acceso al sistema
								</label>
								<p className={styles.usuarioHint}>
									Genera el registro en imPassword con el mismo ID del personal para poder iniciar sesión.
								</p>
							</div>
							{formData.CrearUsuario && (
								<div className={styles.usuarioGrid}>
									<div className={`${styles.field} ${styles.fieldHalf}`}>
										<label className={styles.label}>Usuario (NombreRed) *</label>
										<input
											type='text'
											name='NombreRed'
											value={formData.NombreRed || ''}
											onChange={handleChange}
											className={`${styles.input} ${errors.NombreRed ? styles.inputError : ''}`}
											autoComplete='off'
											placeholder='Ej. jperez'
											tabIndex={42}
										/>
										{errors.NombreRed && (
											<span className={styles.error}>{errors.NombreRed}</span>
										)}
									</div>
									<div className={`${styles.field} ${styles.fieldHalf}`}>
										<label className={styles.label}>Código operador</label>
										<input
											type='text'
											value={
												formData.MatriculaProvincial
													? String(formData.MatriculaProvincial)
													: displayId
														? String(displayId)
														: '—'
											}
											readOnly
											disabled
											className={`${styles.input} ${styles.readOnly}`}
											tabIndex={-1}
										/>
										<span className={styles.fieldHint}>
											Se asigna automáticamente desde la matrícula provincial.
										</span>
									</div>
									<div className={`${styles.field} ${styles.fieldHalf}`}>
										<label className={styles.label}>Contraseña *</label>
										<input
											type='password'
											name='Password'
											value={formData.Password || ''}
											onChange={handleChange}
											className={`${styles.input} ${errors.Password ? styles.inputError : ''}`}
											autoComplete='new-password'
											tabIndex={44}
										/>
										{errors.Password && (
											<span className={styles.error}>{errors.Password}</span>
										)}
									</div>
									<div className={`${styles.field} ${styles.fieldHalf}`}>
										<label className={styles.label}>Confirmar contraseña *</label>
										<input
											type='password'
											name='ConfirmPassword'
											value={formData.ConfirmPassword || ''}
											onChange={handleChange}
											className={`${styles.input} ${errors.ConfirmPassword ? styles.inputError : ''}`}
											autoComplete='new-password'
											tabIndex={45}
										/>
										{errors.ConfirmPassword && (
											<span className={styles.error}>{errors.ConfirmPassword}</span>
										)}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{activeTab === 'cuenta' && showCuentaTab && formData.Valor && (
				<PersonalCuentaTab
					personalId={formData.Valor}
					apellidoNombre={formData.ApellidoNombre}
					matriculaProvincial={formData.MatriculaProvincial || null}
					variant='form'
				/>
			)}

			{activeTab === 'agenda' && showAgendaTab && (
				<AgendaTab matricula={matriculaProfesional} />
			)}
			</div>

			<div className={styles.actions}>
				{(activeTab === 'cuenta' || activeTab === 'agenda') && (
					<p className={styles.tabActionsHint}>
						Los cambios de esta solapa se guardan con el botón dentro de la sección.
					</p>
				)}
				<div className={styles.actionsButtons}>
				<button
					type='button'
					onClick={onCancel}
					className={styles.cancelButton}
					disabled={internalSubmitting}
					tabIndex={50}
				>
					Cancelar
				</button>
				{activeTab !== 'cuenta' && activeTab !== 'agenda' && (
				<button
					type='submit'
					className={`${styles.submitButton} ${internalSubmitting ? styles.loading : ''}`}
					disabled={internalSubmitting || isSubmitting}
					tabIndex={51}
				>
					{internalSubmitting && <span className={styles.inlineSpinner} aria-hidden='true' />}
					{internalSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
				</button>
				)}
				</div>
			</div>
		</form>
	);
}
