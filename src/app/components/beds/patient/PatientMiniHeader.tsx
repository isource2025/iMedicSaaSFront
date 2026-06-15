'use client';
import { useState, useEffect, useCallback } from 'react';
import s from './PatientMiniHeader.module.css';
import Loader from '../../Loader/Loader';
import { FiCalendar, FiClock } from 'react-icons/fi';
import { IoMale, IoFemale } from 'react-icons/io5';
import { Bed } from 'lucide-react';
import { usePatients } from '../../../hooks/usePatients';
import visitaMovimientoService from '../../../services/visitaMovimientoService';
import { formatSqlDate } from '../../../utils/dateUtils';
import { apiFetch } from '@/app/utils/authFetch';

type Props = {
	numeroVisita: string | number;
	burgerButton?: React.ReactNode;
};

interface PacienteData {
	numeroVisita: string;
	apellidoYNombre: string;
	numeroDocumento: string;
	sexo: string;
	valorSector: string;
	valorHabitacionCama: string;
	coberturaSocial: string;
	fechaAdmisionS: string;
}

export default function PatientMiniHeader({
	numeroVisita,
	burgerButton,
}: Props) {
	const { patients } = usePatients();
	const [pacienteData, setPacienteData] = useState<PacienteData | null>(null);
	const [loading, setLoading] = useState(true);

	const cargarDatosPaciente = useCallback(async () => {
		if (!numeroVisita) return;

		setLoading(true);

		try {
			// Obtener datos de todas las camas (mismo endpoint que ModalBasePaciente)
			const res = await apiFetch('/beds');
			if (!res.ok) throw new Error('Error al obtener información del paciente');

			const data = await res.json();
			if (!data.success) throw new Error(data.message || 'Error al obtener datos');

			// Obtener datos de la visita para tener acceso a FechaAdmisionS
			const visitaResponse = await apiFetch(
				`/patients/visitas/${numeroVisita}`,
			);
			let visitaData = null;
			if (visitaResponse.ok) {
				const visitaResult = await visitaResponse.json();
				if (visitaResult.success) {
					visitaData = visitaResult.data;
				}
			}

			// Buscar la cama por NumeroVisita
			const cama = data.data.find((c: any) => String(c.NumeroVisita) === String(numeroVisita));
			
			if (cama) {
				const pacienteInfo = patients?.find(
					(p) => p.IDPaciente === Number(cama.IdPaciente),
				);

				const pd: PacienteData = {
					numeroVisita: String(numeroVisita),
					apellidoYNombre: pacienteInfo?.ApellidoyNombre || cama.NombrePaciente || 'N/A',
					numeroDocumento: cama.DocumentoPaciente || 'N/A',
					sexo: pacienteInfo?.Sexo || cama.SexoPaciente || '',
					valorSector: cama.ValorSector || 'N/A',
					valorHabitacionCama: cama.ValorHabitacionCama || 'N/A',
					coberturaSocial: cama.RazonSocialCliente || 'N/A',
					fechaAdmisionS: visitaData?.fechaAdmisionS || '',
				};

				setPacienteData(pd);
			}
		} catch (err: any) {
			console.error('Error cargando datos del paciente:', err);
		} finally {
			setLoading(false);
		}
	}, [numeroVisita, patients]);

	useEffect(() => {
		cargarDatosPaciente();
	}, [cargarDatosPaciente]);

	const renderGenderIcon = () => {
		const sexoValue = pacienteData?.sexo ? pacienteData.sexo.toUpperCase() : '';
		if (sexoValue === 'M' || sexoValue === 'MASCULINO') {
			return <IoMale className={s.masculino} title="Masculino" />;
		} else if (sexoValue === 'F' || sexoValue === 'FEMENINO') {
			return <IoFemale className={s.femenino} title="Femenino" />;
		}
		return null;
	};

	if (loading) {
		return (
			<div style={{ position: 'relative', minHeight: '80px' }}>
				<Loader />
			</div>
		);
	}

	return (
		<div className={s.wrap}>
			{/* Sección Izquierda */}
			<div className={s.headerLeft}>
				{/* Fila 1: Documento + Icono género */}
				<div className={s.documentoRow}>
					{pacienteData?.numeroDocumento && pacienteData.numeroDocumento !== 'N/A' && (
						<span className={s.documentoNumero}>{pacienteData.numeroDocumento}</span>
					)}
					{renderGenderIcon()}
				</div>

				{/* Fila 2: Nombre del paciente */}
				<h3 className={s.nombrePaciente}>{pacienteData?.apellidoYNombre || 'Paciente'}</h3>

				{/* Fila 3: Admisión + Ubicación */}
				<div className={s.infoRow}>
					{/* Admisión */}
					{pacienteData?.fechaAdmisionS && (
						<div className={s.admisionBlock}>
							<span className={s.infoLabel}>ADMISIÓN:</span>
							<div className={s.infoValues}>
								<span className={s.infoValueItem}>
									<FiCalendar className={s.infoIcon} />
									{formatSqlDate(pacienteData.fechaAdmisionS, {
										locale: 'es-AR',
										showTime: false,
										adjustTimezone: false,
									})}
								</span>
								<span className={s.infoValueItem}>
									<FiClock className={s.infoIcon} />
									{formatSqlDate(pacienteData.fechaAdmisionS, {
										locale: 'es-AR',
										showDate: false,
										showTime: true,
										adjustTimezone: false,
									})}
								</span>
							</div>
						</div>
					)}

					{/* Ubicación */}
					{(pacienteData?.valorSector || pacienteData?.valorHabitacionCama) && (
						<div className={s.ubicacionBlock}>
							<span className={s.infoLabel}>UBICACIÓN:</span>
							<div className={s.infoValues}>
								{pacienteData?.valorSector && pacienteData.valorSector !== 'N/A' && (
									<span className={s.sectorBadge}>{pacienteData.valorSector}</span>
								)}
								{pacienteData?.valorHabitacionCama && pacienteData.valorHabitacionCama !== 'N/A' && (
									<span className={s.camaInfo}>
										<Bed className={s.camaIcon} size={16} />
										{pacienteData.valorHabitacionCama}
									</span>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Sección Derecha */}
			<div className={s.headerRight}>
				{/* Número de Visita */}
				{numeroVisita && (
					<div className={s.visitaBlock}>
						<span className={s.visitaNumber}>
							{String(numeroVisita).split('').join(' ')}
						</span>
						<span className={s.visitaLabel}>N° DE VISITA</span>
					</div>
				)}

				{/* Cobertura */}
				<div className={s.coberturaBlock}>
					<span className={s.coberturaValue}>{pacienteData?.coberturaSocial || 'N/A'}</span>
					<span className={s.coberturaLabel}>COBERTURA</span>
				</div>
			</div>

			{/* Botón menú en esquina inferior derecha */}
			<div className={s.menuButtonContainer}>
				{burgerButton}
			</div>
		</div>
	);
}
