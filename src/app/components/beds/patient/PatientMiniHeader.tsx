'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import s from './PatientMiniHeader.module.css';
import Loader from '../../Loader/Loader';
import { FiCalendar, FiClock } from 'react-icons/fi';
import { IoMale, IoFemale } from 'react-icons/io5';
import { Bed } from 'lucide-react';
import { formatSqlDate } from '../../../utils/dateUtils';
import { apiFetch } from '@/app/utils/authFetch';
import {
	type PatientHeaderSnapshot,
	hasUsableHeader,
} from '../../../utils/bedHeader';

type Props = {
	numeroVisita: string | number;
	burgerButton?: React.ReactNode;
	/** Si viene de la card/detalle, no se vuelve a pedir /beds */
	header?: PatientHeaderSnapshot | null;
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
	fechaIngresoSQL: string;
	horaIngresoSQL: string;
}

function snapshotToData(
	numeroVisita: string | number,
	h: PatientHeaderSnapshot,
): PacienteData {
	return {
		numeroVisita: String(numeroVisita),
		apellidoYNombre: h.nombre || 'Paciente',
		numeroDocumento: h.documento || 'N/A',
		sexo: h.sexo || '',
		valorSector: h.sector || 'N/A',
		valorHabitacionCama: h.numeroCama || 'N/A',
		coberturaSocial: h.cobertura || 'N/A',
		fechaAdmisionS: h.fechaAdmisionS || '',
		fechaIngresoSQL: h.fechaIngresoSQL || '',
		horaIngresoSQL: h.horaIngresoSQL || '',
	};
}

export default function PatientMiniHeader({
	numeroVisita,
	burgerButton,
	header,
}: Props) {
	const fromProps = useMemo(
		() => (hasUsableHeader(header) ? snapshotToData(numeroVisita, header!) : null),
		[header, numeroVisita],
	);

	const [pacienteData, setPacienteData] = useState<PacienteData | null>(fromProps);
	const [loading, setLoading] = useState(!fromProps);

	useEffect(() => {
		if (fromProps) {
			setPacienteData(fromProps);
			setLoading(false);
		}
	}, [fromProps]);

	const cargarDatosPaciente = useCallback(async () => {
		if (!numeroVisita || fromProps) return;

		setLoading(true);
		try {
			const res = await apiFetch('/beds');
			if (!res.ok) throw new Error('Error al obtener información del paciente');

			const data = await res.json();
			if (!data.success) throw new Error(data.message || 'Error al obtener datos');

			const cama = (data.data || []).find(
				(c: { NumeroVisita?: number | string }) =>
					String(c.NumeroVisita) === String(numeroVisita),
			);

			if (cama) {
				setPacienteData({
					numeroVisita: String(numeroVisita),
					apellidoYNombre: cama.NombrePaciente || 'N/A',
					numeroDocumento: cama.DocumentoPaciente || 'N/A',
					sexo: cama.SexoPaciente || '',
					valorSector: cama.ValorSector || 'N/A',
					valorHabitacionCama: cama.ValorHabitacionCama || 'N/A',
					coberturaSocial: cama.RazonSocialCliente || 'N/A',
					fechaAdmisionS: '',
					fechaIngresoSQL: String(cama.fechaIngresoSQL || ''),
					horaIngresoSQL: String(cama.horaIngresoSQL || ''),
				});
			}
		} catch (err) {
			console.error('Error cargando datos del paciente:', err);
		} finally {
			setLoading(false);
		}
	}, [numeroVisita, fromProps]);

	useEffect(() => {
		if (!fromProps) cargarDatosPaciente();
	}, [cargarDatosPaciente, fromProps]);

	const renderGenderIcon = () => {
		const sexoValue = pacienteData?.sexo ? pacienteData.sexo.toUpperCase() : '';
		if (sexoValue === 'M' || sexoValue === 'MASCULINO') {
			return <IoMale className={s.masculino} title="Masculino" />;
		}
		if (sexoValue === 'F' || sexoValue === 'FEMENINO') {
			return <IoFemale className={s.femenino} title="Femenino" />;
		}
		return null;
	};

	const fechaLabel = (() => {
		if (pacienteData?.fechaIngresoSQL) return pacienteData.fechaIngresoSQL;
		if (pacienteData?.fechaAdmisionS) {
			return formatSqlDate(pacienteData.fechaAdmisionS, {
				locale: 'es-AR',
				showTime: false,
				adjustTimezone: false,
			});
		}
		return '';
	})();

	const horaLabel = (() => {
		if (pacienteData?.horaIngresoSQL) {
			const h = pacienteData.horaIngresoSQL;
			return h.length >= 5 ? h.slice(0, 5) : h;
		}
		if (pacienteData?.fechaAdmisionS) {
			return formatSqlDate(pacienteData.fechaAdmisionS, {
				locale: 'es-AR',
				showDate: false,
				showTime: true,
				adjustTimezone: false,
			});
		}
		return '';
	})();

	if (loading) {
		return (
			<div style={{ position: 'relative', minHeight: '80px' }}>
				<Loader />
			</div>
		);
	}

	return (
		<div className={s.wrap}>
			<div className={s.headerLeft}>
				<div className={s.documentoRow}>
					{pacienteData?.numeroDocumento &&
						pacienteData.numeroDocumento !== 'N/A' && (
							<span className={s.documentoNumero}>
								{pacienteData.numeroDocumento}
							</span>
						)}
					{renderGenderIcon()}
				</div>

				<h3 className={s.nombrePaciente}>
					{pacienteData?.apellidoYNombre || 'Paciente'}
				</h3>

				<div className={s.infoRow}>
					{(fechaLabel || horaLabel) && (
						<div className={s.admisionBlock}>
							<span className={s.infoLabel}>ADMISIÓN:</span>
							<div className={s.infoValues}>
								{fechaLabel ? (
									<span className={s.infoValueItem}>
										<FiCalendar className={s.infoIcon} />
										{fechaLabel}
									</span>
								) : null}
								{horaLabel ? (
									<span className={s.infoValueItem}>
										<FiClock className={s.infoIcon} />
										{horaLabel}
									</span>
								) : null}
							</div>
						</div>
					)}

					{(pacienteData?.valorSector || pacienteData?.valorHabitacionCama) && (
						<div className={s.ubicacionBlock}>
							<span className={s.infoLabel}>UBICACIÓN:</span>
							<div className={s.infoValues}>
								{pacienteData?.valorSector &&
									pacienteData.valorSector !== 'N/A' && (
										<span className={s.sectorBadge}>
											{pacienteData.valorSector}
										</span>
									)}
								{pacienteData?.valorHabitacionCama &&
									pacienteData.valorHabitacionCama !== 'N/A' && (
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

			<div className={s.headerRight}>
				{numeroVisita ? (
					<div className={s.visitaBlock}>
						<span className={s.visitaNumber}>
							{String(numeroVisita).split('').join(' ')}
						</span>
						<span className={s.visitaLabel}>N° DE VISITA</span>
					</div>
				) : null}

				<div className={s.coberturaBlock}>
					<span className={s.coberturaValue}>
						{pacienteData?.coberturaSocial || 'N/A'}
					</span>
					<span className={s.coberturaLabel}>COBERTURA</span>
				</div>
			</div>

			<div className={s.menuButtonContainer}>{burgerButton}</div>
		</div>
	);
}
