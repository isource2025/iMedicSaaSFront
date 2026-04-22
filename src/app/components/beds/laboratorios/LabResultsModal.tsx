'use client';

import ModalBasePaciente from '../../modals/ModalBasePaciente';
import LabResultsSection from './LabResultsSection';

interface LabResultsModalProps {
	isOpen: boolean;
	onClose: () => void;
	numeroVisita: number;
}

export default function LabResultsModal({
	isOpen,
	onClose,
	numeroVisita,
}: LabResultsModalProps) {
	return (
		<ModalBasePaciente
			isOpen={isOpen}
			onClose={onClose}
			titulo='Resultados de Laboratorio'
			numeroVisita={String(numeroVisita)}
		>
			<LabResultsSection numeroVisita={numeroVisita} />
		</ModalBasePaciente>
	);
}
