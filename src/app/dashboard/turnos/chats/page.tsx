'use client';

import { usePermiso } from '@/app/hooks/usePermiso';
import AgendaWhatsAppInbox from '@/app/components/Agenda/AgendaWhatsAppInbox';
import styles from '../agenda/agenda.module.css';

export default function ConversacionesPage() {
	const { puedeSubmodulo, puede } = usePermiso();
	const puedeVer = puedeSubmodulo('TURNOS', 'AGENDA');
	const puedeEditar =
		puede('TURNOS.AGENDA.EDITAR') || puedeSubmodulo('TURNOS', 'AGENDA');

	if (!puedeVer) {
		return (
			<div className={styles.page}>
				<p className={styles.warning}>No tenés permiso para ver las conversaciones.</p>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<div className={styles.layoutFull}>
				<div className={styles.main}>
					<div className={styles.mainCard}>
						<div className={styles.cardHeader}>
							<h1 className={styles.cardTitle}>Conversaciones WhatsApp</h1>
							<p className={styles.cardSubtitle}>
								Inbox de chats — pausá el bot, tomá el control y respondé como agente.
							</p>
						</div>
						<div className={styles.cardBody}>
							<AgendaWhatsAppInbox puedeEditar={puedeEditar} fullHeight />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
