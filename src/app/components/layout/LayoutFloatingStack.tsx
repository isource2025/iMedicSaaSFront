'use client';

import FloatingActionsRail from './FloatingActionsRail';
import NotificationsFab from './NotificationsFab';
import PatientFolderFab from './PatientFolderFab';

/** Botones flotantes globales (notificaciones + carpeta de paciente). */
export default function LayoutFloatingStack() {
	return (
		<FloatingActionsRail ariaLabel="Acciones rápidas globales">
			<NotificationsFab stack />
			<PatientFolderFab stack />
		</FloatingActionsRail>
	);
}
