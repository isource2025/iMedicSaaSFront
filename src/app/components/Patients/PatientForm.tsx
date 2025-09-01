import { Patient, PatientFormData } from '../../types/PatientInterface';
import { PatientFormBase } from './PatientFormBase';
import styles from './PatientForm.module.css';

interface PatientFormProps {
	patient?: Patient;
	onSubmit: (data: PatientFormData) => Promise<boolean>;
	onCancel: () => void;
	isEditing?: boolean;
	isSubmitting: boolean;
}

export default function PatientForm({
	patient,
	onSubmit,
	onCancel,
	isEditing,
	isSubmitting,
}: PatientFormProps) {
	return (
		<PatientFormBase
			onSubmit={onSubmit}
			initialData={patient}
			isEditing={isEditing}
			isSubmitting={isSubmitting}
			onClose={onCancel}
		/>
	);
}
