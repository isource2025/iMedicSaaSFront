'use client';

import styles from './AgendaResumenPanel.module.css';

interface Props {
	fechaLabel: string;
	nombreProfesional?: string;
	servicioLabel?: string;
	especialidadLabel?: string;
	stats: { total: number; libres: number; ocupados: number };
}

export default function AgendaResumenPanel({
	fechaLabel,
	nombreProfesional,
	servicioLabel,
	especialidadLabel,
	stats,
}: Props) {
	return (
		<div className={styles.panel}>
			<div className={styles.header}>
				<span className={styles.headerIcon} aria-hidden>
					{'\u{1F4CB}'}
				</span>
				<div>
					<h3 className={styles.title}>Resumen de la agenda</h3>
					<p className={styles.subtitle}>{fechaLabel}</p>
				</div>
			</div>
			<div className={styles.grid}>
				<div className={styles.item}>
					<span className={styles.label}>Profesional</span>
					<span className={styles.value}>{nombreProfesional || '\u2014'}</span>
				</div>
				<div className={styles.item}>
					<span className={styles.label}>Servicio</span>
					<span className={styles.value}>{servicioLabel || '\u2014'}</span>
				</div>
				<div className={styles.item}>
					<span className={styles.label}>Especialidad</span>
					<span className={styles.value}>{especialidadLabel || '\u2014'}</span>
				</div>
				<div className={styles.item}>
					<span className={styles.label}>Cupos del día</span>
					<span className={styles.value}>
						{stats.libres} libres · {stats.ocupados} ocupados · {stats.total} total
					</span>
				</div>
			</div>
			<p className={styles.hint}>
				Hacé clic en un turno libre para asignar paciente. En turnos ocupados, el menú
				permite cambiar, cancelar o cerrar el turno.
			</p>
		</div>
	);
}
