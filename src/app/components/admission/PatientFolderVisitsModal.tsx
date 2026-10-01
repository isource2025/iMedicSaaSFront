'use client';

import Modal from '@/app/components/UI/Modal';
import type { AdmissionSearchRow } from '@/app/services/admissionSearchService';
import PatientFolderVisitsContent from './PatientFolderVisitsContent';

interface PatientFolderVisitsModalProps {
	isOpen: boolean;
	onClose: () => void;
	patient: AdmissionSearchRow | null;
	visits: AdmissionSearchRow[];
}

export default function PatientFolderVisitsModal({
	isOpen,
	onClose,
	patient,
	visits,
}: PatientFolderVisitsModalProps) {
	if (!patient) return null;

	const title = `Carpeta — ${patient.ApellidoYNombre || 'Paciente'}`;

	// `Modal` no renderiza hijos cerrado: el estado de `PatientFolderVisitsContent`
	// se reinicia solo al cerrar.
	return (
		<Modal isOpen={isOpen} onClose={onClose} title={title} size="large">
			<PatientFolderVisitsContent patient={patient} visits={visits} />
		</Modal>
	);
}
