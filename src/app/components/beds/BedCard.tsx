'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { indicacionesService } from '../../services/indicacionesService';
import estudiosService from '../../services/estudiosService';

/**
 * Tarjeta de recurso hospitalario (cama / consultorio / insumos).
 * El tipo sale de imHabitacionCamas.Tipo (texto plano).
 */
function etiquetaTipoRecurso(bed: Pick<Bed, 'tipoRaw'>, fallback = 'Cama'): string {
	const raw = (bed.tipoRaw ?? '').trim();
	if (!raw) return fallback;
	return raw;
}

function etiquetaTipoIndicacion(tipo?: string): string {
	const t = String(tipo || '').trim().toUpperCase();
	if (t === 'M' || t.includes('MEDIC')) return 'Medicamento';
	if (t === 'D' || t.includes('DIET')) return 'Dieta';
	if (t === 'C' || t.includes('CONTROL')) return 'Control';
	if (t === 'A' || t.includes('ASIST')) return 'Asistencial';
	return tipo ? String(tipo) : 'Indicación';
}

function fechaHoraCorta(valor?: string | null): string {
	const m = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
	if (!m) return '';
	return `${m[3]}/${m[2]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}`;
}

type SideTabPreviewItem = { nombre: string; meta: string };

const PREVIEW_LIMIT = 3;

/** Pestaña lateral de la card con preview al hover (indicaciones nuevas / estudios respondidos). */
function SideTabConPreview({
	count,
	titulo,
	className,
	icon,
	ariaLabel,
	cargar,
	onOpen,
}: {
	count: number;
	titulo: string;
	className: string;
	icon: React.ReactNode;
	ariaLabel: string;
	cargar: () => Promise<{ total: number; items: SideTabPreviewItem[] }>;
	onOpen: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [items, setItems] = useState<SideTabPreviewItem[] | null>(null);
	const [total, setTotal] = useState(count);
	const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const wrapRef = useRef<HTMLSpanElement>(null);
	const previewRef = useRef<HTMLDivElement>(null);

	const load = async () => {
		if (items) return;
		setLoading(true);
		try {
			const data = await cargar();
			setItems(data.items);
			setTotal(data.total || count);
		} catch {
			setItems([]);
		} finally {
			setLoading(false);
		}
	};

	const show = () => {
		if (hideTimer.current) clearTimeout(hideTimer.current);
		setOpen(true);
		void load();
	};

	const hide = () => {
		hideTimer.current = setTimeout(() => setOpen(false), 160);
	};

	useLayoutEffect(() => {
		if (!open) return;

		const place = () => {
			const anchor = wrapRef.current;
			const preview = previewRef.current;
			if (!anchor || !preview) return;

			const rect = anchor.getBoundingClientRect();
			const pw = preview.offsetWidth;
			const ph = preview.offsetHeight;
			const gap = 8;
			const abrirArriba = window.innerHeight - rect.top - gap < ph && rect.bottom > ph + gap;

			let left = rect.right + gap;
			if (left + pw > window.innerWidth - 8) left = rect.left - pw - gap;
			left = Math.max(8, left);
			let top = abrirArriba ? rect.bottom - ph : rect.top;
			top = Math.max(8, Math.min(top, window.innerHeight - ph - 8));

			preview.style.left = `${left}px`;
			preview.style.top = `${top}px`;
		};

		place();
		window.addEventListener('scroll', place, true);
		window.addEventListener('resize', place);
		return () => {
			window.removeEventListener('scroll', place, true);
			window.removeEventListener('resize', place);
		};
	}, [open, items, loading]);

	const restantes = Math.max(0, total - (items?.length || 0));

	const preview = open
		? createPortal(
				<div
					ref={previewRef}
					className={styles.indicacionesPreview}
					onMouseEnter={show}
					onMouseLeave={hide}
					onClick={(e) => e.stopPropagation()}
				>
					<p className={styles.indicacionesPreviewTitle}>{titulo}</p>
					{loading && !items ? (
						<p className={styles.indicacionesPreviewEmpty}>Cargando…</p>
					) : !items?.length ? (
						<p className={styles.indicacionesPreviewEmpty}>Sin detalle para mostrar</p>
					) : (
						<ul className={styles.indicacionesPreviewList}>
							{items.map((item, idx) => (
								<li key={`${item.nombre}-${idx}`} className={styles.indicacionesPreviewItem}>
									<span className={styles.indicacionesPreviewName}>{item.nombre}</span>
									{item.meta ? (
										<span className={styles.indicacionesPreviewMeta}>{item.meta}</span>
									) : null}
								</li>
							))}
						</ul>
					)}
					{restantes > 0 ? (
						<p className={styles.indicacionesPreviewMore}>
							+{restantes} más. Abrí la cama para verlos.
						</p>
					) : null}
				</div>,
				document.body
			)
		: null;

	return (
		<span
			ref={wrapRef}
			className={styles.indicacionesBadgeWrap}
			onMouseEnter={show}
			onMouseLeave={hide}
		>
			<button
				type="button"
				className={`${styles.sideTab} ${className}`}
				aria-label={ariaLabel}
				onClick={(e) => {
					e.stopPropagation();
					onOpen();
				}}
			>
				{icon}
				<span className={styles.sideTabCount}>{count}</span>
			</button>
			{preview}
		</span>
	);
}

function IndicacionesNuevasBadge({
	numeroVisita,
	count,
	onOpen,
}: {
	numeroVisita: number;
	count: number;
	onOpen: () => void;
}) {
	return (
		<SideTabConPreview
			count={count}
			titulo="Indicaciones nuevas"
			className={styles.sideTabIndicaciones}
			icon={<ClipboardList size={14} strokeWidth={2.4} aria-hidden />}
			ariaLabel={`${count} indicación${count === 1 ? '' : 'es'} nueva${count === 1 ? '' : 's'} sin revisar por enfermería. Abrir indicaciones`}
			onOpen={onOpen}
			cargar={async () => {
				const data = await indicacionesService.getNuevasEnfermeria(numeroVisita, PREVIEW_LIMIT);
				return {
					total: data.total,
					items: data.items.map((item) => ({
						nombre: item.descripcion || 'Sin descripción',
						meta: [
							etiquetaTipoIndicacion(item.tipo),
							item.frecuencia || '',
							item.cantidad != null && String(item.cantidad) !== ''
								? `${item.cantidad}${item.tipoUnidad ? ` ${item.tipoUnidad}` : ''}`
								: '',
						]
							.filter(Boolean)
							.join(' · '),
					})),
				};
			}}
		/>
	);
}

function EstudiosRespondidosBadge({
	numeroVisita,
	count,
	onOpen,
}: {
	numeroVisita: number;
	count: number;
	onOpen: () => void;
}) {
	return (
		<SideTabConPreview
			count={count}
			titulo="Estudios e interconsultas respondidos"
			className={styles.sideTabEstudios}
			icon={<IoFlaskOutline size={14} aria-hidden />}
			ariaLabel={`${count} estudios e interconsultas respondidos. Abrir estudios`}
			onOpen={onOpen}
			cargar={async () => {
				const data = await estudiosService.getRespondidosResumen(numeroVisita, PREVIEW_LIMIT);
				return {
					total: data.total,
					items: data.items.map((item) => {
						const esInterconsulta = item.categoria === 'INTERCONSULTA';
						const nombre = esInterconsulta
							? `Interconsulta${item.especialidad ? ` · ${item.especialidad}` : ''}`
							: item.descripcion || 'Estudio sin descripción';
						return {
							nombre,
							meta: [
								esInterconsulta ? '' : item.especialidad || '',
								fechaHoraCorta(item.fechaResultado) ? `Resp. ${fechaHoraCorta(item.fechaResultado)}` : '',
							]
								.filter(Boolean)
								.join(' · '),
						};
					}),
				};
			}}
		/>
	);
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
	onOpenSection,
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
				onOpenSection={onOpenSection}
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
			onOpenSection={onOpenSection}
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
	onOpenSection,
}: BedCardProps & { variant: 'cama' | 'consultorio' }) {
	const nuevasIndicaciones = Number(bed.indicacionesNuevasEnfermeria || 0);
	const mostrarBadgeIndicaciones =
		!!bed.numeroVisita &&
		bed.numeroVisita !== 0 &&
		nuevasIndicaciones > 0 &&
		bed.estado !== 'desocupada' &&
		bed.estado !== 'disponible';
	const estudiosRespondidos = Number(bed.estudiosRespondidos || 0);
	const mostrarBadgeEstudios =
		!!bed.numeroVisita &&
		estudiosRespondidos > 0 &&
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
			{mostrarBadgeIndicaciones || mostrarBadgeEstudios ? (
				<div className={styles.sideTabs}>
					{mostrarBadgeIndicaciones ? (
						<IndicacionesNuevasBadge
							numeroVisita={Number(bed.numeroVisita)}
							count={nuevasIndicaciones}
							onOpen={() => {
								if (onOpenSection) onOpenSection(bed.id, 'indicaciones');
								else if (onRecentIndications) onRecentIndications(bed.id);
								else onBedClick?.(bed.id);
							}}
						/>
					) : null}
					{mostrarBadgeEstudios ? (
						<EstudiosRespondidosBadge
							numeroVisita={Number(bed.numeroVisita)}
							count={estudiosRespondidos}
							onOpen={() => {
								if (onOpenSection) onOpenSection(bed.id, 'solicitudEstudios');
								else onBedClick?.(bed.id);
							}}
						/>
					) : null}
				</div>
			) : null}
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
