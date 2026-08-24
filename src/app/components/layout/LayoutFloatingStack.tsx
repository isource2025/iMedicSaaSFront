'use client';

import NotificationsFab from './NotificationsFab';
import PatientFolderFab from './PatientFolderFab';
import styles from './LayoutFloatingStack.module.css';

/** Botones flotantes globales (notificaciones + carpeta de paciente). */
export default function LayoutFloatingStack() {
	return (
		<div className={styles.root} aria-label="Acciones rápidas globales">
			<NotificationsFab stack />
			<PatientFolderFab stack />
		</div>
	);
}
