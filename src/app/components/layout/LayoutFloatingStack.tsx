'use client';

import { useEffect } from 'react';
import NotificationsFab from './NotificationsFab';
import PatientFolderFab from './PatientFolderFab';
import styles from './LayoutFloatingStack.module.css';

/** Botones flotantes globales (notificaciones + carpeta de paciente). */
export default function LayoutFloatingStack() {
	useEffect(() => {
		void import('@/app/services/estudiosService').then(({ default: estudiosService }) => {
			void estudiosService.listarSectoresReceptor({ soloMios: true });
			void estudiosService.listarSectoresReceptor();
		});
	}, []);

	return (
		<div className={styles.root} aria-label="Acciones rápidas globales">
			<NotificationsFab stack />
			<PatientFolderFab stack />
		</div>
	);
}
