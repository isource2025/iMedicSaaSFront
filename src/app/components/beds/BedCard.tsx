'use client';

import React from 'react';
import { BedCardProps } from '../../types/beds/BedComponents';
import type { Bed } from '../../types/beds';
import styles from './BedCard.module.css';
import {
	IoMedicalOutline,
	IoSwapHorizontalOutline,
	IoAttachOutline,
	IoMale,
	IoFemale,
	IoFlaskOutline,
	IoExitOutline,
	IoTimeOutline,
	IoAddOutline,
} from 'react-icons/io5';
import { Stethoscope, Warehouse, PackagePlus, Boxes, ArrowRightLeft, ClipboardList } from 'lucide-react';
import { usePermiso } from '../../hooks/usePermiso';
import { esEnfermeroSesion } from '../../hooks/useUsuarioActual';

/**
 * Tarjeta de recurso hospitalario (cama / consultorio / insumos).
 * El tipo sale de imHabitacionCamas.Tipo (texto plano).
 */
/** Texto del badge / etiqueta desde imHabitacionCamas.Tipo */
function etiquetaTipoRecurso(bed: Pick<Bed, 'tipoRaw'>, fallback = 'Cama'): string {
	const raw = (bed.tipoRaw ?? '').trim();
	if (!raw) return fallback;
	return raw;
}

const BedCard: React.FC<BedCardProps> = ({
	bed,
	onNursingReport,
	onRecentIndications,
	onChangeBed,
	onBedClick,
	onLabResults,
	onDischarge,
	onAssignPatient,
	onOpenAdjuntos,
}) => {
	const recurso = bed.tipoRecurso ?? 'cama';

	if (recurso === 'insumos') {
		return (
			<InsumoCard
				bed={bed}
				onBedClick={onBedClick}
				onLabResults={onLabResults}
				onRecentIndications={onRecentIndications}
			/>
		);
	}

	if (recurso === 'consultorio') {
		return (
			<CamaOConsultorioCard
				variant="consultorio"
				bed={bed}
				onNursingReport={onNursingReport}
				onChangeBed={onChangeBed}
				onBedClick={onBedClick}
				onLabResults={onLabResults}
				onDischarge={onDischarge}
				onAssignPatient={onAssignPatient}
				onOpenAdjuntos={onOpenAdjuntos}
				onRecentIndications={onRecentIndications}
			/>
		);
	}

	return (
		<CamaOConsultorioCard
			variant="cama"
			bed={bed}
			onNursingReport={onNursingReport}
			onChangeBed={onChangeBed}
			onBedClick={onBedClick}
			onLabResults={onLabResults}
			onDischarge={onDischarge}
			onAssignPatient={onAssignPatient}
			onOpenAdjuntos={onOpenAdjuntos}
			onRecentIndications={onRecentIndications}
		/>
	);
};

/** Cama (internación) o Consultorio: misma rejilla, distintas acciones y cabecera */
function CamaOConsultorioCard({
	variant,
	bed,
	onNursingReport,
	onChangeBed,
	onBedClick,
	onLabResults,
	onDischarge,
	onAssignPatient,
	onOpenAdjuntos,
	onRecentIndications,
}: BedCardProps & { variant: 'cama' | 'consultorio' }) {
	const { loaded } = usePermiso();
	const esEnfermero = loaded && esEnfermeroSesion();
	const nuevasIndicaciones = Number(bed.indicacionesNuevasEnfermeria || 0);
	const mostrarBadgeIndicaciones =
		esEnfermero &&
		!!bed.numeroVisita &&
		bed.numeroVisita !== 0 &&
		nuevasIndicaciones > 0 &&
		bed.estado !== 'desocupada' &&
		bed.estado !== 'disponible';
	const renderGenderIcon = () => {
		const sexoValue = bed.SexoPaciente ? bed.SexoPaciente.toLowerCase() : '';
		if (sexoValue === 'm' || sexoValue === 'masculino') {
			return <IoMale className={styles.maleIcon} title={bed.descripcionSexo || 'Masculino'} />;
		}
		if (sexoValue === 'f' || sexoValue === 'femenino') {
			return <IoFemale className={styles.femaleIcon} title={bed.descripcionSexo || 'Femenino'} />;
		}
		return null;
	};

	let edadStr: string | null = null;
	const fechaNacimiento =
		(bed as unknown as { fechaNacimientoPaciente?: string }).fechaNacimientoPaciente ||
		(bed as unknown as { fechaNacimiento?: string }).fechaNacimiento;
	if (fechaNacimiento) {
		const nacimiento = new Date(fechaNacimiento);
		if (!isNaN(nacimiento.getTime())) {
			const hoy = new Date();
			let edad = hoy.getFullYear() - nacimiento.getFullYear();
			const m = hoy.getMonth() - nacimiento.getMonth();
			if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
				edad--;
			}
			edadStr = `${edad} años`;
		}
	}

	const isLibre = bed.estado === 'desocupada' || bed.estado === 'disponible';
	const isOcupada = bed.estado === 'ocupada';
	const isAislada = bed.estado === 'aislada';
	let estadoClass = '';
	if (isOcupada && variant === 'consultorio') estadoClass = styles['estado-consultorio-ocupada'];
	else if (isOcupada) estadoClass = styles['estado-ocupada'];
	else if (isLibre) estadoClass = styles['estado-libre'];
	else if (isAislada) estadoClass = styles['estado-aislada'];
	else if (bed.estado) estadoClass = styles[`estado-${bed.estado}`] || '';

	const wrapperMod =
		variant === 'consultorio' ? styles.tipoConsultorio : styles.tipoCamaInternacion;

	const puedeAsignar = variant === 'cama' && isLibre && !!onAssignPatient;

	return (
		<div
			className={`${styles.bedCard} ${wrapperMod} ${estadoClass} ${puedeAsignar ? styles.bedCardAssignable : ''}`}
			onClick={() => onBedClick && onBedClick(bed.id)}
		>
			<div className={styles.cardHeader}>
				<div className={styles.bedInfo}>
					{variant === 'consultorio' && (
						<span className={styles.tipoBadgeConsultorio} title={etiquetaTipoRecurso(bed, 'Consultorio')}>
							<Stethoscope size={14} strokeWidth={2.2} aria-hidden />
							{etiquetaTipoRecurso(bed, 'Consultorio')}
						</span>
					)}
					{variant === 'cama' && (
						<span className={styles.tipoBadgeCama} title={etiquetaTipoRecurso(bed, 'Cama')}>
							{etiquetaTipoRecurso(bed, 'Cama')}
						</span>
					)}
					<span className={styles.sectorLabel}>{bed.sector}</span>
					<span className={styles.bedNumber}>{bed.numeroCama}</span>
				</div>
				{bed.numeroVisita && bed.numeroVisita !== 0 ? (
					<div className={styles.headerRight}>
						<div className={styles.visitaHeader}>
							{bed.numeroVisita}
							{renderGenderIcon()}
							{mostrarBadgeIndicaciones ? (
								<button
									type="button"
									className={styles.indicacionesBadge}
									title={`${nuevasIndicaciones} indicación${nuevasIndicaciones === 1 ? '' : 'es'} nueva${nuevasIndicaciones === 1 ? '' : 's'} por revisar`}
									onClick={(e) => {
										e.stopPropagation();
										if (onRecentIndications) onRecentIndications(bed.id);
										else onBedClick?.(bed.id);
									}}
								>
									<ClipboardList size={15} strokeWidth={2.4} aria-hidden />
									<span className={styles.indicacionesBadgeCount}>{nuevasIndicaciones}</span>
								</button>
							) : null}
						</div>
					</div>
				) : null}
			</div>
			<div className={styles.cardBody}>
				{isOcupada ? (
					<>
						<div className={styles.primaryData}>
							<div className={styles.patientData}>
								<span className={styles.documentNumber}>{bed.documentoPaciente}</span>
								<span className={styles.patientName}>
									<strong>{bed.NombrePaciente}</strong>
								</span>

								<div className={styles.dateTimeContainer}>
									{(bed as { fechaIngresoSQL?: string }).fechaIngresoSQL && (
										<span className={styles.date}>
											<p className={styles.dateLabel}>Fecha de ingreso</p>
											{(bed as { fechaIngresoSQL?: string }).fechaIngresoSQL}
											{(bed as { horaIngresoSQL?: string }).horaIngresoSQL && (
												<span className={styles.timeValue}>
													<IoTimeOutline className={styles.timeIcon} />
													{(bed as { horaIngresoSQL?: string }).horaIngresoSQL}
												</span>
											)}
										</span>
									)}
								</div>
								{bed.servicioMedicoDescripcion && (
									<span className={styles.date}>{bed.servicioMedicoDescripcion}</span>
								)}
								{bed.razonSocialCliente && (
									<span className={styles.date}>{bed.razonSocialCliente}</span>
								)}
								{edadStr && <span className={styles.date}>{edadStr}</span>}
							</div>
						</div>

						{bed.diagnosticoDescripcion && (
							<div className={styles.diagnosticSection}>
								<p className={styles.diagnostic}>{bed.diagnosticoDescripcion}</p>
							</div>
						)}
						<div className={styles.iconsContainer}>
							{variant === 'cama' && (
								<span
									className={styles.iconWrapper}
									title="Reporte de Enfermería"
									onClick={(e) => {
										e.stopPropagation();
										onNursingReport(bed);
									}}
								>
									<IoMedicalOutline className={styles.actionIcon} />
								</span>
							)}

							<span
								className={styles.iconWrapper}
								title="Resultados de Laboratorio"
								onClick={(e) => {
									e.stopPropagation();
									onLabResults && onLabResults(bed.id);
								}}
							>
								<IoFlaskOutline className={styles.actionIcon} />
							</span>

							<span
								className={styles.iconWrapper}
								title="Archivos adjuntos"
								onClick={(e) => {
									e.stopPropagation();
									onOpenAdjuntos?.(bed);
								}}
							>
								<IoAttachOutline className={styles.actionIcon} />
							</span>

							{variant === 'cama' && (
								<>
									<span
										className={styles.iconWrapper}
										title="Cambiar Cama"
										onClick={(e) => {
											e.stopPropagation();
											onChangeBed && onChangeBed(bed.id);
										}}
									>
										<IoSwapHorizontalOutline className={styles.actionIcon} />
									</span>
									<span
										className={styles.iconWrapper}
										title="Egreso del Paciente"
										onClick={(e) => {
											e.stopPropagation();
											onDischarge && onDischarge(bed.id);
										}}
									>
										<IoExitOutline className={styles.actionIcon} />
									</span>
								</>
							)}
						</div>
					</>
				) : (
					<div className={styles.freeBodyContent}>
						<span className={styles.statusBadge}>{bed.estadoDescripcion || 'Sin estado'}</span>
						{puedeAsignar && (
							<button
								type="button"
								className={styles.assignPlusBtn}
								title="Asignar internado sin cama"
								aria-label="Asignar paciente a esta cama"
								onClick={(e) => {
									e.stopPropagation();
									onAssignPatient?.(bed);
								}}
							>
								<IoAddOutline size={28} />
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

function InsumoCard({
	bed,
	onBedClick,
	onLabResults,
	onRecentIndications,
}: Pick<BedCardProps, 'bed'> & {
	onBedClick?: (id: string) => void;
	onLabResults?: (id: string) => void;
	onRecentIndications?: (id: string) => void;
}) {
	const isLibre = bed.estado === 'desocupada' || bed.estado === 'disponible';
	const isOcupada = bed.estado === 'ocupada';
	const conVisita =
		isOcupada && bed.numeroVisita != null && bed.numeroVisita !== 0;
	let estadoClass = '';
	if (isOcupada) estadoClass = styles['estado-ocupada'];
	else if (isLibre) estadoClass = styles['estado-libre'];
	else if (bed.estado) estadoClass = styles[`estado-${bed.estado}`] || '';

	const tipoLabel = etiquetaTipoRecurso(bed, 'Insumos');
	const tituloStockMovimiento =
		'Disponible solo con ubicación ocupada y número de visita';
	const stockMock = 68;

	return (
		<div
			className={`${styles.bedCard} ${styles.cardInsumos} ${estadoClass}`}
			onClick={() => onBedClick?.(bed.id)}
		>
			<div className={styles.insumoHrShell}>
				<div className={styles.insumoHrTopRow}>
					<div className={styles.insumoHrIconGroup}>
						<div className={styles.insumoHrOverlay} aria-hidden />
						<div className={styles.insumoHrCircle}>
							<Warehouse
								className={styles.insumoHrIcon}
								strokeWidth={1.75}
								size={56}
								aria-hidden
							/>
						</div>
					</div>
					<div className={styles.insumoStockMockup} aria-label={`Stock ${stockMock}%`}>
						<span className={styles.insumoStockLabel}>Stock</span>
						<div className={styles.insumoStockBarTrack}>
							<div
								className={styles.insumoStockBarFill}
								style={{ width: `${stockMock}%` }}
							/>
						</div>
						<span className={styles.insumoStockValue}>{stockMock}%</span>
					</div>
				</div>
				<p className={styles.insumoHrTitle}>{tipoLabel}</p>
			</div>

			<div className={styles.cardBody}>
				{isOcupada ? (<></>
				) : (
					<div className={styles.insumoLibre}>
						<span className={styles.statusBadge}>{bed.estadoDescripcion || 'Disponible'}</span>
					</div>
				)}

				<div className={`${styles.iconsContainer} ${styles.insumoIconsRow}`}>
					<span
						className={styles.iconWrapper}
						title="Solicitar insumos"
						onClick={(e) => {
							e.stopPropagation();
							onBedClick?.(bed.id);
						}}
					>
						<PackagePlus size={32} strokeWidth={2.1} className={styles.actionIcon} />
					</span>
					<span
						className={`${styles.iconWrapper} ${conVisita ? '' : styles.iconWrapperDisabled}`}
						title={conVisita ? 'Detalle de Stock' : tituloStockMovimiento}
						onClick={(e) => {
							e.stopPropagation();
							if (conVisita) onLabResults?.(bed.id);
						}}
					>
						<Boxes size={32} strokeWidth={2.1} className={styles.actionIcon} />
					</span>
					<span
						className={`${styles.iconWrapper} ${conVisita ? '' : styles.iconWrapperDisabled}`}
						title={conVisita ? 'Mover Insumos' : tituloStockMovimiento}
						onClick={(e) => {
							e.stopPropagation();
							if (conVisita) onRecentIndications?.(bed.id);
						}}
					>
						<ArrowRightLeft size={32} strokeWidth={2.1} className={styles.actionIcon} />
					</span>
				</div>
			</div>
		</div>
	);
}

export default BedCard;
