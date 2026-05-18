'use client';

import { PatientFormData } from '../../../types/PatientFormInterface';
import Modal from '../../../components/UI/Modal';
import { PatientFormBase } from '../../../components/Patients/PatientFormBase';

interface ModalAddPatientProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (data: PatientFormData) => Promise<boolean>;
	initialData?: Partial<PatientFormData>;
	isEditing?: boolean;
	isSubmitting: boolean;
	priority?: 'default' | 'high';
}

const ModalAddPatient: React.FC<ModalAddPatientProps> = ({
	isOpen,
	onClose,
	onSubmit,
	initialData = {},
	isEditing = false,
	isSubmitting,
	priority = 'default',
}) => {
	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={isEditing ? 'Editar Paciente' : 'Agregar Paciente'}
			size='full'
			priority={priority}
		>
			<PatientFormBase
				onSubmit={onSubmit}
				initialData={initialData}
				isEditing={isEditing}
				onClose={onClose}
				isSubmitting={isSubmitting}
			/>
		</Modal>
	);
};

export default ModalAddPatient;
