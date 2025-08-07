// src/app/pages/patients/AddPatient/ModalTrabajo.tsx

import { useState, useEffect } from 'react';
import { Trabajo } from '@/src/app/types/PatientInterface';
import styles from './LaboralModal.module.css'; // Usaremos un nuevo archivo de estilos

interface Option {
	value: string;
	label: string;
}

interface ModalTrabajoProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (trabajo: Trabajo) => void;
	initialData: Partial<Trabajo> | null; // Datos para editar o null para agregar
	// Opciones para los selects, que vendrán desde el padre
	ocupacionOptions: Option[];
	situacionOptions: Option[];
	estudiosOptions: Option[];
}

const initialTrabajoState: Trabajo = {
	id: new Date().getTime(), // ID temporal para nuevos trabajos
	Ocupacion: '',
	RazonSocial: '',
	// ... inicializa el resto de los campos
};

export default function ModalTrabajo({
	isOpen,
	onClose,
	onSave,
	initialData,
	ocupacionOptions,
	situacionOptions,
	estudiosOptions,
}: ModalTrabajoProps) {
	const [trabajo, setTrabajo] = useState<Partial<Trabajo>>(initialTrabajoState);

	useEffect(() => {
		// Si recibimos datos iniciales (modo edición), poblamos el formulario.
		// Si no, lo reseteamos (modo agregar).
		if (initialData) {
			setTrabajo(initialData);
		} else {
			setTrabajo(initialTrabajoState);
		}
	}, [initialData, isOpen]);

	if (!isOpen) return null;

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setTrabajo((prev) => ({ ...prev, [name]: value }));
	};

	const handleSave = () => {
		onSave(trabajo as Trabajo);
		onClose(); // Cierra el modal después de guardar
	};

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContent}>
				<h3>{initialData ? 'Editar Empleo' : 'Agregar Empleo'}</h3>
				<div className={styles.formGrid}>
					{/* Ocupación */}
					<div className={styles.formGroup}>
						<label>Ocupación</label>
						<select
							name='Ocupacion'
							value={trabajo.Ocupacion || ''}
							onChange={handleChange}
						>
							<option value=''>Seleccione...</option>
							{ocupacionOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
					{/* Razón Social */}
					<div className={styles.formGroup}>
						<label>Razón Social</label>
						<input
							type='text'
							name='RazonSocial'
							value={trabajo.RazonSocial || ''}
							onChange={handleChange}
						/>
					</div>
					{/* CUIT Empresa */}
					<div className={styles.formGroup}>
						<label>CUIT Empresa</label>
						<input
							type='text'
							name='CuitEmpresa'
							value={trabajo.CuitEmpresa || ''}
							onChange={handleChange}
						/>
					</div>
					{/* Domicilio Empresa */}
					<div className={styles.formGroup}>
						<label>Domicilio Empresa</label>
						<input
							type='text'
							name='DomicilioEmpresa'
							value={trabajo.DomicilioEmpresa || ''}
							onChange={handleChange}
						/>
					</div>
					{/* Teléfono Empresa */}
					<div className={styles.formGroup}>
						<label>Teléfono Empresa</label>
						<input
							type='text'
							name='TelefonoEmpresa'
							value={trabajo.TelefonoEmpresa || ''}
							onChange={handleChange}
						/>
					</div>
					{/* Situación Laboral */}
					<div className={styles.formGroup}>
						<label>Situación Laboral</label>
						<select
							name='SituacionLaboral'
							value={trabajo.SituacionLaboral || ''}
							onChange={handleChange}
						>
							<option value=''>Seleccione...</option>
							{situacionOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
					{/* Nivel de Estudios */}
					<div className={styles.formGroup}>
						<label>Nivel de Estudios</label>
						<select
							name='NivelEstudios'
							value={trabajo.NivelEstudios || ''}
							onChange={handleChange}
						>
							<option value=''>Seleccione...</option>
							{estudiosOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className={styles.buttonContainer}>
					<button onClick={onClose} className={styles.cancelButton}>
						Cancelar
					</button>
					<button onClick={handleSave} className={styles.saveButton}>
						Guardar
					</button>
				</div>
			</div>
		</div>
	);
}
