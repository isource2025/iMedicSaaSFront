'use client';

import ModalBasePaciente from '../../modals/ModalBasePaciente';
import LabResultsSection from './LabResultsSection';
import type { PatientHeaderSnapshot } from '@/app/utils/bedHeader';

interface LabResultsModalProps {
	isOpen: boolean;
	onClose: () => void;
	numeroVisita: number;
	header?: PatientHeaderSnapshot | null;
}

export default function LabResultsModal({
	isOpen,
	onClose,
	numeroVisita,
	header,
}: LabResultsModalProps) {
	return (
		<ModalBasePaciente
			isOpen={isOpen}
			onClose={onClose}
			titulo='Resultados de Laboratorio'
			numeroVisita={String(numeroVisita)}
			header={header}
		>
			<LabResultsSection numeroVisita={numeroVisita} />
		</ModalBasePaciente>
	);
}
