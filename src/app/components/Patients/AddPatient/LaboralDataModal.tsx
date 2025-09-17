import { useState, useEffect } from 'react';
import { Trabajo } from '@/src/app/types/PatientInterface';
import styles from './LaboralModal.module.css';

interface ModalTrabajoProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (trabajo: Trabajo) => void;
	initialData: Partial<Trabajo> | null;
}

const newTrabajo = (): Trabajo => ({
	DocumentoEmpresa: '',
	RazonSocial: '',
	DomicilioEmpresa: '',
	TelefonoEmpresa: '',
	CuitEmpresa: '',
});

export default function LaboralDataModal({
	isOpen,
	onClose,
	onSave,
	initialData,
}: ModalTrabajoProps) {
	const [trabajo, setTrabajo] = useState<Trabajo>(newTrabajo());
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		if (!isOpen) return;

		if (initialData) {
			// Mantén el id existente; el resto se rellena con defaults
			setTrabajo({ ...newTrabajo(), ...initialData } as Trabajo);
		} else {
			setTrabajo(newTrabajo());
		}
		setErrors({});
	}, [isOpen, initialData]);

	if (!isOpen) return null;

	const setField = (name: keyof Trabajo, value: string) => {
		setTrabajo((prev) => ({ ...prev, [name]: value }));
		if (errors[name]) {
			const n = { ...errors };
			delete n[name as string];
			setErrors(n);
		}
	};

	const validate = (): boolean => {
		const e: Record<string, string> = {};
		if (!trabajo.RazonSocial?.trim()) e.RazonSocial = 'Razón social es obligatoria';
		if (!trabajo.CuitEmpresa?.trim()) e.CuitEmpresa = 'CUIT es obligatorio';
		setErrors(e);
		return Object.keys(e).length === 0;
	};

	const handleSave = () => {
		if (!validate()) return;
		onSave(trabajo);
		onClose();
	};

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
				<h3>{initialData ? 'Editar Empleo' : 'Agregar Empleo'}</h3>

				<div className={styles.formGrid}>
					<div
						className={`${styles.formGroup} ${
							errors.RazonSocial ? styles.hasError : ''
						}`}
					>
						<label>Razón social</label>
						<input
							className={styles.input}
							type='text'
							name='RazonSocial'
							value={trabajo.RazonSocial || ''}
							onChange={(e) => setField('RazonSocial', e.target.value)}
						/>
						{errors.RazonSocial && (
							<span className={styles.error}>{errors.RazonSocial}</span>
						)}
					</div>

					<div className={styles.formGroup}>
						<label>Domicilio empresa</label>
						<input
							className={styles.input}
							type='text'
							name='DomicilioEmpresa'
							value={trabajo.DomicilioEmpresa || ''}
							onChange={(e) => setField('DomicilioEmpresa', e.target.value)}
						/>
					</div>

					<div className={styles.formGroup}>
						<label>Teléfono empresa</label>
						<input
							className={styles.input}
							type='text'
							name='TelefonoEmpresa'
							value={trabajo.TelefonoEmpresa || ''}
							onChange={(e) => setField('TelefonoEmpresa', e.target.value)}
						/>
					</div>
					<div
						className={`${styles.formGroup} ${
							errors.CuitEmpresa ? styles.hasError : ''
						}`}
					>
						<label>CUIT empresa</label>
						<input
							className={styles.input}
							type='text'
							name='CuitEmpresa'
							value={trabajo.CuitEmpresa || ''}
							onChange={(e) => setField('CuitEmpresa', e.target.value)}
							placeholder='XX-XXXXXXXX-X'
						/>
						{errors.CuitEmpresa && (
							<span className={styles.error}>{errors.CuitEmpresa}</span>
						)}
					</div>
				</div>
				<div className={styles.buttonContainer}>
					<button type='button' onClick={onClose} className={styles.cancelButton}>
						Cancelar
					</button>
					<button type='button' onClick={handleSave} className={styles.saveButton}>
						Guardar
					</button>
				</div>
			</div>
		</div>
	);
}
