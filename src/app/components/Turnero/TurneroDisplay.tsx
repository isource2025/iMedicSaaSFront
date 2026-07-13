'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TurneroConfig, TurneroDisplayState, TurneroLlamado, TurneroMedicoHoy } from '@/app/types/turnero';
import { expandTurneroTheme } from './turneroTheme';
import TurneroVideoPlayer from './TurneroVideoPlayer';
import { TZ_ARGENTINA, formatHoraArgentina, horaWallArgentina } from '@/app/utils/dateUtils';
import styles from './TurneroDisplay.module.css';

function formatHora(iso: string | null, preformateada?: string | null): string {
	if (preformateada) return preformateada;
	return formatHoraArgentina(iso);
}

interface Props {
	state: Pick<TurneroDisplayState, 'config' | 'empresa' | 'ultimoLlamado' | 'llamados' | 'medicosHoy'>;
	preview?: boolean;
	/** Tras gesto del usuario en pantalla live (desbloquea audio del video). */
	mediaUnlocked?: boolean;
	/** Durante anuncio de llamado (baja volumen del video). */
	videoAtenuado?: boolean;
	/** Resalta animación al cambiar el llamado principal (live). */
	highlightKey?: number;
}

export default function TurneroDisplay({
	state,
	preview = false,
	mediaUnlocked = false,
	videoAtenuado = false,
	highlightKey,
}: Props) {
	const { config, empresa, ultimoLlamado, llamados, medicosHoy = [] } = state;
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		if (!config.display.mostrarHora) return;
		const t = setInterval(() => setNow(new Date()), 30_000);
		return () => clearInterval(t);
	}, [config.display.mostrarHora]);

	const rootClass = [
		styles.turneroRoot,
		preview ? styles.preview : '',
		config.plantilla === 'moderna' ? styles.moderna : '',
		config.plantilla === 'alto-contraste' ? styles.altoContraste : '',
	]
		.filter(Boolean)
		.join(' ');

	const bodyClass = useMemo(() => {
		if (!config.video.activo || !config.video.url?.trim()) return styles.bodyNoVideo;
		return config.video.posicion === 'derecha' ? styles.bodyVideoRight : styles.bodyVideoLeft;
	}, [config.video]);

	const videoCol = `${config.video.proporcion || 40}%`;
	const themeVars = useMemo(() => expandTurneroTheme(config.colores), [config.colores]);

	const showVideo = config.video.activo && !!config.video.url?.trim();
	const showLlamados = config.display.mostrarLlamados !== false;
	const showMedicos = config.display.mostrarMedicosHoy !== false;

	const lista = showLlamados
		? llamados.length > 0
			? llamados
			: ultimoLlamado
				? [ultimoLlamado]
				: []
		: [];
	const recientes = lista.slice(1, config.display.maxLlamadosLista);
	const soloMedicos = !showLlamados && showMedicos;

	return (
		<div
			className={`${rootClass}${soloMedicos ? ` ${styles.soloMedicos}` : ''}`}
			style={
				{
					...themeVars,
					'--t-escala': config.tipografia.escala,
					'--t-familia': config.tipografia.familia,
					'--t-video-col': videoCol,
				} as React.CSSProperties
			}
		>
			<header className={styles.header}>
				{config.display.tituloInstitucion ? (
					<h1 className={styles.headerTitle}>{empresa?.nombre || 'Turnero'}</h1>
				) : (
					<span />
				)}
				{config.display.mostrarHora && (
					<time className={styles.clock} dateTime={now.toISOString()}>
						{now.toLocaleTimeString('es-AR', {
							timeZone: TZ_ARGENTINA,
							hour: '2-digit',
							minute: '2-digit',
						})}
					</time>
				)}
			</header>

			<div className={`${styles.body} ${bodyClass}`}>
				{showVideo && (
					<div
						className={styles.videoPane}
						style={
							config.video.posicion === 'derecha' ? { order: 2 } : undefined
						}
					>
						<TurneroVideoPlayer
							video={config.video}
							mediaUnlocked={preview || mediaUnlocked}
							atenuado={videoAtenuado}
						/>
					</div>
				)}

				<div className={styles.contentPane} style={config.video.posicion === 'derecha' ? { order: 1 } : undefined}>
					{showLlamados && (
						<section className={`${styles.hero} ${highlightKey ? styles.heroPulse : ''}`} key={highlightKey ?? ultimoLlamado?.idLlamado ?? 'empty'}>
							{ultimoLlamado ? (
								<>
									<p className={styles.heroLabel}>Último llamado</p>
									<h2 className={styles.heroName}>{ultimoLlamado.paciente}</h2>
									<p className={styles.heroMeta}>
										{config.display.mostrarConsultorio && ultimoLlamado.consultorio && (
											<span>Consultorio {ultimoLlamado.consultorio}</span>
										)}
										{config.display.mostrarProfesional && ultimoLlamado.profesional && (
											<span>{ultimoLlamado.profesional}</span>
										)}
										{config.display.mostrarHora && ultimoLlamado.horaTurno && (
											<span>Turno {ultimoLlamado.horaTurno}</span>
										)}
									</p>
								</>
							) : (
								<p className={styles.emptyHero}>Esperando llamados…</p>
							)}
						</section>
					)}

					{showLlamados && recientes.length > 0 && (
						<section className={styles.listSection}>
							<h3 className={styles.listTitle}>Llamados recientes</h3>
							<ul className={styles.list}>
								{recientes.map((item: TurneroLlamado) => (
									<li key={item.idLlamado} className={styles.listItem}>
										<span className={styles.listName}>{item.paciente}</span>
										<span className={styles.listMeta}>
											{[
												config.display.mostrarConsultorio && item.consultorio
													? `Cons. ${item.consultorio}`
													: null,
												config.display.mostrarHora && item.horaTurno ? item.horaTurno : null,
												formatHora(item.llamadoEn, item.llamadoEnHora),
											]
												.filter(Boolean)
												.join(' · ')}
										</span>
									</li>
								))}
							</ul>
						</section>
					)}

					{showMedicos && (
						<section className={`${styles.medicosPanel}${soloMedicos ? ` ${styles.medicosPanelHero}` : ''}`}>
							<h3 className={styles.listTitle}>
								{soloMedicos ? 'Médicos que atienden hoy' : 'Atienden hoy'}
							</h3>
							{medicosHoy.length > 0 ? (
								<div className={styles.medicosGrid}>
									{medicosHoy.map((m: TurneroMedicoHoy) => (
										<div key={m.matricula} className={styles.medicoCard}>
											<p className={styles.medicoNombre}>{m.nombre}</p>
											<p className={styles.medicoHorario}>
												{m.horarioTexto}
												{m.consultorio ? ` · Cons. ${m.consultorio}` : ''}
											</p>
										</div>
									))}
								</div>
							) : (
								<p className={styles.emptyHero}>No hay médicos con horario para hoy.</p>
							)}
						</section>
					)}

					{!showLlamados && !showMedicos && (
						<p className={styles.emptyHero}>
							Activá «Mostrar llamados» o «Médicos que atienden hoy» en la configuración de
							pantalla.
						</p>
					)}
				</div>
			</div>
		</div>
	);
}

/** Estado mock para vista previa en configuración. */
export function buildPreviewState(config: TurneroConfig): Pick<
	TurneroDisplayState,
	'config' | 'empresa' | 'ultimoLlamado' | 'llamados' | 'medicosHoy'
> {
	const mock: TurneroLlamado = {
		idLlamado: 1,
		idTurno: 100,
		paciente: 'María González',
		consultorio: '2',
		profesional: 'Dr. Martínez',
		sector: 'AMB',
		horaTurno: '10:30',
		llamadoEn: new Date().toISOString(),
		llamadoEnHora: horaWallArgentina(false),
	};
	const mock2: TurneroLlamado = {
		idLlamado: 2,
		idTurno: 99,
		paciente: 'Carlos López',
		consultorio: '1',
		profesional: 'Dra. Ruiz',
		sector: 'AMB',
		horaTurno: '10:00',
		llamadoEn: new Date(Date.now() - 120_000).toISOString(),
		llamadoEnHora: horaWallArgentina(false, new Date(Date.now() - 120_000)),
	};
	return {
		config,
		empresa: { nombre: 'Vista previa — Institución' },
		ultimoLlamado: config.display.mostrarLlamados !== false ? mock : null,
		llamados: config.display.mostrarLlamados !== false ? [mock, mock2] : [],
		medicosHoy: [
			{
				matricula: 1,
				nombre: 'Dr. Martínez',
				consultorio: '2',
				horarioTexto: '08:00 – 12:00',
			},
			{
				matricula: 2,
				nombre: 'Dra. Ruiz',
				consultorio: '1',
				horarioTexto: '09:00 – 13:00, 15:00 – 18:00',
			},
		],
	};
}
