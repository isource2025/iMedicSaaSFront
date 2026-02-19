'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './ModalBasePaciente.module.css';
import {
	formatDate,
	formatTime,
	clarionDateToDate,
	formatSqlDate,
} from '../../utils/dateUtils';
import { usePatients } from '../../hooks/usePatients';
import visitaMovimientoService from '../../services/visitaMovimientoService';
import { FiCalendar, FiClock } from 'react-icons/fi';

interface PacienteData {
	numeroVisita: string;
	idPaciente: string;
	apellidoYNombre: string;
	numeroDocumento: string;
	fechaAdmisionS: string;
	fechaAdmision: string;
	horaAdmision?: string;
	FechaAdmisionClarion?: number; // Formato Clarion
	HoraAdmisionClarion?: number; // Formato Clarion
	sexo: string;
	fechaNacimiento: string;
	valorSector: string;
	valorHabitacionCama: string;
	coberturaSocial: string;
}

interface ModalBasePacienteProps {
	isOpen: boolean;
	onClose: () => void;
	titulo: string;
	numeroVisita: string;
	children: React.ReactNode;
	footerButtons?: React.ReactNode;
}

const ModalBasePaciente: React.FC<ModalBasePacienteProps> = ({
	isOpen,
	onClose,
	titulo,
	numeroVisita,
	children,
	footerButtons,
}) => {
	const { patients } = usePatients();
	const modalRef = useRef<HTMLDivElement>(null);

	const [pacienteData, setPacienteData] = useState<PacienteData | null>(null);
	const [loading, setLoading] = useState(true); 
	const [error, setError] = useState<string | null>(null);
	const [edad, setEdad] = useState<number | null>(null);
	const [yaConsultado, setYaConsultado] = useState(false);

	const cargarDatosPaciente = useCallback(async () => {
		if (!isOpen || !numeroVisita || yaConsultado) return;

		setLoading(true);
		setError(null);

		try {
			// Obtener datos de la cama
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/beds`);
			if (!res.ok) throw new Error('Error al obtener información del paciente');

			const data = await res.json();
			if (!data.success) throw new Error(data.message || 'Error al obtener datos');

			// Obtener datos del último movimiento de la visita
			const movimiento = await visitaMovimientoService.getUltimoMovimiento(numeroVisita);

			// Obtener datos de la visita para tener acceso a FechaAdmisionS
			const visitaResponse = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/patients/visitas/${numeroVisita}`,
			);
			let visitaData = null;
			if (visitaResponse.ok) {
				const visitaResult = await visitaResponse.json();
				if (visitaResult.success) {
					visitaData = visitaResult.data;
					console.log('Datos de visita obtenidos:', visitaData);
				}
			}

			const cama = data.data.find((c: any) => String(c.NumeroVisita) === numeroVisita);
			if (cama) {
				const pacienteInfo = patients?.find(
					(p) => p.IDPaciente === Number(cama.IdPaciente),
				);

				// Fecha y hora de admisión desde el movimiento o desde la cama
				const fechaAdmisionISO = cama.FechaIngreso
					? clarionDateToDate(cama.FechaIngreso)?.toISOString() ||
					  new Date().toISOString()
					: new Date().toISOString();

				const pd: PacienteData = {
					numeroVisita,
					idPaciente: cama.IdPaciente || 'N/A',
					apellidoYNombre:
						pacienteInfo?.ApellidoyNombre || cama.NombrePaciente || 'N/A',
					numeroDocumento: cama.DocumentoPaciente || 'N/A',
					fechaAdmisionS: visitaData?.fechaAdmisionS || '',
					fechaAdmision: fechaAdmisionISO,
					// Agregar datos de fecha y hora desde el movimiento si existen
					FechaAdmisionClarion: movimiento?.FechaAdmision,
					HoraAdmisionClarion: movimiento?.HoraAdmision,
					sexo: pacienteInfo?.Sexo || cama.SexoPaciente || 'N/A',
					fechaNacimiento: pacienteInfo?.FechaNacimiento || '',
					valorSector: cama.ValorSector || 'N/A',
					valorHabitacionCama: cama.ValorHabitacionCama || 'N/A',
					coberturaSocial: cama.RazonSocialCliente || 'N/A',
				};

				setPacienteData(pd);

				if (pd.fechaNacimiento) {
					const fn = new Date(pd.fechaNacimiento);
					const hoy = new Date();
					let calc = hoy.getFullYear() - fn.getFullYear();
					const m = hoy.getMonth() - fn.getMonth();
					if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) calc--;
					setEdad(calc);
				}
			} else {
				setPacienteData({
					numeroVisita,
					idPaciente: 'N/A',
					apellidoYNombre: 'Paciente',
					numeroDocumento: 'N/A',
					fechaAdmisionS: visitaData?.fechaAdmisionS || '',
					fechaAdmision: new Date().toISOString(),
					sexo: 'N/A',
					fechaNacimiento: '',
					valorSector: 'N/A',
					valorHabitacionCama: 'N/A',
					coberturaSocial: 'N/A',
				});
			}
			setYaConsultado(true);
		} catch (err: any) {
			console.error(err);
			setError(err.message || 'Error al cargar datos del paciente');
			setPacienteData(null);
		} finally {
			setLoading(false);
		}
	}, [isOpen, numeroVisita, yaConsultado, patients]);

	useEffect(() => {
		if (isOpen) {
			if (pacienteData?.numeroVisita !== numeroVisita) setYaConsultado(false);
			cargarDatosPaciente();
		}
	}, [isOpen, numeroVisita, cargarDatosPaciente, pacienteData?.numeroVisita]);

	if (!isOpen) return null;

	const iconoSexo =
		pacienteData?.sexo === 'M' ? '♂️' : pacienteData?.sexo === 'F' ? '♀️' : '⚧';
	const claseSexo =
		pacienteData?.sexo === 'M'
			? styles.masculino
			: pacienteData?.sexo === 'F'
			? styles.femenino
			: styles.otro;

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContainer} ref={modalRef}>
				<div className={styles.modalHeader}>
					<h2 className={styles.modalTitulo}>{titulo}</h2>
					<button className={styles.closeButton} onClick={onClose}>
						×
					</button>
				</div>

				{loading ? (
					<div className={styles.loadingContainer}>
						<div className={styles.loading}>
							Cargando información del paciente...
						</div>
					</div>
				) : error || !pacienteData ? (
					<div className={styles.errorContainer}>
						<div className={styles.error}>
							{error || 'No se pudo obtener la información'}
						</div>
					</div>
				) : (
					<>
						<div className={styles.pacienteHeader}>
							{/* Sección Izquierda */}
							<div className={styles.headerLeft}>
								{/* Fila 1: Documento + Icono género */}
								<div className={styles.documentoRow}>
									<span className={styles.documentoNumero}>
										{pacienteData.numeroDocumento}
									</span>
									<span className={`${styles.sexoIcono} ${claseSexo}`}>
										{iconoSexo}
									</span>
								</div>

								{/* Fila 2: Nombre del paciente */}
								<h3 className={styles.nombrePaciente}>
									{pacienteData.apellidoYNombre}
								</h3>

								{/* Fila 3: Admisión + Ubicación */}
								<div className={styles.infoRow}>
									{/* Admisión */}
									<div className={styles.admisionBlock}>
										<span className={styles.infoLabel}>ADMISIÓN:</span>
										<div className={styles.infoValues}>
											{pacienteData?.fechaAdmisionS ? (
												<>
													<span className={styles.infoValueItem}>
														<FiCalendar className={styles.infoIcon} />
														{formatSqlDate(pacienteData.fechaAdmisionS, {
															locale: 'es-AR',
															showTime: false,
															adjustTimezone: false,
														})}
													</span>
													<span className={styles.infoValueItem}>
														<FiClock className={styles.infoIcon} />
														{formatSqlDate(pacienteData.fechaAdmisionS, {
															locale: 'es-AR',
															showDate: false,
															showTime: true,
															adjustTimezone: false,
														})}
													</span>
												</>
											) : (
												<span className={styles.infoValueItem}>No disponible</span>
											)}
										</div>
									</div>

									{/* Ubicación */}
									<div className={styles.ubicacionBlock}>
										<span className={styles.infoLabel}>UBICACIÓN:</span>
										<div className={styles.infoValues}>
											<span className={styles.sectorBadge}>
												{pacienteData.valorSector}
											</span>
											<span className={styles.camaInfo}>
												<span className={styles.camaIcon}>🛏</span>
												{pacienteData.valorHabitacionCama}
											</span>
										</div>
									</div>
								</div>
							</div>

							{/* Sección Derecha */}
							<div className={styles.headerRight}>
								{/* Número de Visita */}
								{Number(pacienteData.numeroVisita) > 0 && (
									<div className={styles.visitaBlock}>
										<span className={styles.visitaNumber}>
											{String(pacienteData.numeroVisita).split('').join(' ')}
										</span>
										<span className={styles.visitaLabel}>N° DE VISITA</span>
									</div>
								)}

								{/* Cobertura */}
								<div className={styles.coberturaBlock}>
									<span className={styles.coberturaValue}>
										{pacienteData.coberturaSocial || 'N/A'}
									</span>
									<span className={styles.coberturaLabel}>COBERTURA</span>
								</div>
							</div>
						</div>

						<div className={styles.separador}></div>

						<div className={styles.modalContent}>{children}</div>

						<div className={styles.modalFooter}>
							<button className={styles.cancelButton} onClick={onClose}>
								Cerrar
							</button>
							{footerButtons}
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default ModalBasePaciente;
