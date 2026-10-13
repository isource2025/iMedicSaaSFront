'use client';

import AsistenteFab from '../Asistente/AsistenteFab';
import FloatingActionsRail from './FloatingActionsRail';
import NotificationsFab from './NotificationsFab';
import PatientFolderFab from './PatientFolderFab';

/** Botones flotantes globales: notificaciones y carpeta plegables; el asistente IA siempre visible abajo. */
export default function LayoutFloatingStack() {
	return (
		<FloatingActionsRail ariaLabel="Acciones rápidas globales" footer={<AsistenteFab stack />}>
			<NotificationsFab stack />
			<PatientFolderFab stack />
		</FloatingActionsRail>
	);
}
