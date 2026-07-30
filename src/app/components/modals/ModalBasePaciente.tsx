'use client';

import { useRef, useContext } from 'react';
import styles from './ModalBasePaciente.module.css';
import PatientMiniHeader from '../beds/patient/PatientMiniHeader';
import {
	type PatientHeaderSnapshot,
	bedToHeaderSnapshot,
	hasUsableHeader,
} from '../../utils/bedHeader';
import { BedDetailContext } from '../beds/contexts/BedDetailContext';

interface ModalBasePacienteProps {
	isOpen: boolean;
	onClose: () => void;
	titulo: string;
	numeroVisita: string;
	children: React.ReactNode;
	footerButtons?: React.ReactNode;
	/** Snapshot desde card/detalle — evita GET /beds en el header */
	header?: PatientHeaderSnapshot | null;
}

const ModalBasePaciente: React.FC<ModalBasePacienteProps> = ({
	isOpen,
	onClose,
	titulo,
	numeroVisita,
	children,
	footerButtons,
	header,
}) => {
	const modalRef = useRef<HTMLDivElement>(null);
	const bedCtx = useContext(BedDetailContext);
	const headerFromBed = bedToHeaderSnapshot(bedCtx?.bed);
	const effectiveHeader =
		hasUsableHeader(header) ? header : hasUsableHeader(headerFromBed) ? headerFromBed : null;

	if (!isOpen) return null;

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContainer} ref={modalRef}>
				<div className={styles.modalHeader}>
					<h2 className={styles.modalTitulo}>{titulo}</h2>
					<button className={styles.closeButton} onClick={onClose} type="button">
						×
					</button>
				</div>

				<div className={styles.pacienteHeader}>
					<PatientMiniHeader
						numeroVisita={numeroVisita}
						header={effectiveHeader}
					/>
				</div>

				<div className={styles.separador}></div>

				<div className={styles.modalContent}>{children}</div>

				<div className={styles.modalFooter}>
					<button className={styles.cancelButton} onClick={onClose} type="button">
						Cerrar
					</button>
					{footerButtons}
				</div>
			</div>
		</div>
	);
};

export default ModalBasePaciente;
