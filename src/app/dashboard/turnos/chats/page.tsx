'use client';

import { usePermiso } from '@/app/hooks/usePermiso';
import AgendaWhatsAppInbox from '@/app/components/Agenda/AgendaWhatsAppInbox';
import styles from '../agenda/agenda.module.css';

export default function ConversacionesPage() {
	const { puede } = usePermiso();
	const puedeVer = puede('TURNOS.CONVERSACIONES.VER');
	const puedeEditar = puede('TURNOS.AGENDA.EDITAR') || puede('TURNOS.CONVERSACIONES.VER');

	if (!puedeVer) {
		return (
			<div className={styles.page}>
				<p className={styles.warning}>No tenés permiso para ver las conversaciones.</p>
			</div>
		);
	}

	return (
		<div className={styles.chatsPage}>
			<div className={styles.layoutFull}>
				<div className={styles.main}>
					<div className={styles.mainCard}>
						<div className={styles.cardHeader}>
							<div className={styles.cardHeaderTop}>
								<div>
									<h1 className={styles.cardTitle}>Conversaciones WhatsApp</h1>
									<p className={styles.cardSubtitle}>
										Inbox de chats — pausá el bot, tomá el control y respondé como agente.
									</p>
								</div>
							</div>
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
