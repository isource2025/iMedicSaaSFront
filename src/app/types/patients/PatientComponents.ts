import { Patient } from '../PatientInterface';

/**
 * Props para el componente PatientForm
 */
export interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: Partial<Patient>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

/**
 * Props para el componente PatientDetails
 */
export interface PatientDetailsProps {
  patient: Patient;
  onClose: () => void;
  onEdit?: () => void;
}

/**
 * Props para el componente PatientList
 */
export interface PatientListProps {
  patients: Patient[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (patient: Patient) => void;
  onDelete: (patient: Patient) => void;
  onView: (patient: Patient) => void;
  onAdmission?: (patient: Patient) => void;
  onViewHistory?: (patient: Patient) => void;
}

/**
 * Props para el componente DeleteConfirmation
 */
export interface DeleteConfirmationProps {
  patient: Patient;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}
