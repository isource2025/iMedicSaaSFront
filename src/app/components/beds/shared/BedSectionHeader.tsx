'use client';

import { ReactNode } from 'react';
import styles from './BedSectionHeader.module.css';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES = [
	'enero',
	'febrero',
	'marzo',
	'abril',
	'mayo',
	'junio',
	'julio',
	'agosto',
	'septiembre',
	'octubre',
	'noviembre',
	'diciembre',
];
const MS_DIA = 86_400_000;

type Relativo = { label: string; tono: 'hoy' | 'pasado' | 'futuro' };

function inicioDelDia(d: Date) {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function relativo(fecha: Date): Relativo {
	const diff = Math.round((inicioDelDia(fecha) - inicioDelDia(new Date())) / MS_DIA);
	if (diff === 0) return { label: 'Hoy', tono: 'hoy' };
	if (diff === -1) return { label: 'Ayer', tono: 'pasado' };
	if (diff === 1) return { label: 'Mañana', tono: 'futuro' };
	if (diff < 0) return { label: `Hace ${-diff} días`, tono: 'pasado' };
	return { label: `En ${diff} días`, tono: 'futuro' };
}

type Props = {
	title: string;
	date?: Date | string | null;
	tag?: ReactNode;
	extra?: ReactNode;
	actionsClassName?: string;
	children?: ReactNode;
};

export default function BedSectionHeader({
	title,
	date,
	tag,
	extra,
	actionsClassName,
	children,
}: Props) {
	const fecha = date ? new Date(date) : null;
	const fechaValida = fecha && !Number.isNaN(fecha.getTime()) ? fecha : null;
	const rel = fechaValida ? relativo(fechaValida) : null;
	const mismoAnio = fechaValida?.getFullYear() === new Date().getFullYear();
	const claveFecha = fechaValida ? inicioDelDia(fechaValida) : 'sin-fecha';

	return (
		<header className={styles.header}>
			{fechaValida ? (
				<time
					key={claveFecha}
					className={`${styles.tile} ${rel?.tono === 'hoy' ? styles.tileHoy : ''}`}
					dateTime={fechaValida.toISOString().slice(0, 10)}
					title={`${DIAS[fechaValida.getDay()]} ${fechaValida.getDate()} de ${MESES[fechaValida.getMonth()]} de ${fechaValida.getFullYear()}`}
				>
					<span className={styles.tileMes}>{MESES_CORTOS[fechaValida.getMonth()]}</span>
					<span className={styles.tileDia}>{fechaValida.getDate()}</span>
				</time>
			) : (
				<span className={styles.accent} aria-hidden />
			)}

			<div className={styles.text}>
				<div className={styles.titleRow}>
					<h2 className={styles.title}>{title}</h2>
					{tag ? <span className={styles.tag}>{tag}</span> : null}
				</div>
				{(fechaValida || extra) && (
					<div key={claveFecha} className={styles.meta}>
						{fechaValida && rel ? (
							<>
								<span className={styles.metaDia}>
									{DIAS[fechaValida.getDay()]}
									{mismoAnio ? '' : ` · ${fechaValida.getFullYear()}`}
								</span>
								<span className={`${styles.rel} ${styles[`rel_${rel.tono}`]}`}>{rel.label}</span>
							</>
						) : null}
						{extra}
					</div>
				)}
			</div>

			{children ? <div className={`${styles.actions} ${actionsClassName ?? ''}`}>{children}</div> : null}
		</header>
	);
}
