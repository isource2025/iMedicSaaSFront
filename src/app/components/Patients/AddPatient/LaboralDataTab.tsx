// src/app/pages/patients/AddPatient/DatosLaboralesTab.tsx

import { useState, useEffect } from 'react';
import { PatientFormData, Trabajo } from '@/src/app/types/PatientInterface';
import LaboralDataModal from './LaboralDataModal';
import styles from './LaboralData.module.css'; // Un nuevo archivo de estilos

interface Option {
	value: string;
	label: string;
}

interface DatosLaboralesTabProps {
	formData: PatientFormData;
	setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>; // Para actualizar el estado padre
}

export default function DatosLaboralesTab({ formData, setFormData }: DatosLaboralesTabProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingTrabajo, setEditingTrabajo] = useState<Partial<Trabajo> | null>(null);

	// Mock de datos para los selects del modal
	const [ocupacionOptions, setOcupacionOptions] = useState<Option[]>([]);
	const [situacionOptions, setSituacionOptions] = useState<Option[]>([]);
	const [estudiosOptions, setEstudiosOptions] = useState<Option[]>([]);

	useEffect(() => {
		// Simular carga de catálogos
		setTimeout(() => {
			setOcupacionOptions([
				{ value: '1', label: 'Analista de Sistemas' },
				{ value: '2', label: 'Contador' },
			]);
			setSituacionOptions([
				{ value: 'A', label: 'Activo' },
				{ value: 'I', label: 'Inactivo' },
			]);
			setEstudiosOptions([
				{ value: 'S', label: 'Secundario' },
				{ value: 'U', label: 'Universitario' },
			]);
		}, 500);
	}, []);

	const handleOpenAddModal = () => {
		setEditingTrabajo(null);
		setIsModalOpen(true);
	};

	const handleOpenEditModal = (trabajo: Trabajo) => {
		setEditingTrabajo(trabajo);
		setIsModalOpen(true);
	};

	const handleDelete = (trabajoId: number | string) => {
		if (window.confirm('¿Estás seguro de que deseas eliminar este empleo?')) {
			setFormData((prev) => ({
				...prev,
				Trabajos: prev.Trabajos?.filter((t) => t.id !== trabajoId) || [],
			}));
		}
	};

	const handleSave = (trabajo: Trabajo) => {
		const trabajos = formData.Trabajos || [];
		const exists = trabajos.find((t) => t.id === trabajo.id);

		if (exists) {
			// Es una edición
			setFormData((prev) => ({
				...prev,
				Trabajos: prev.Trabajos?.map((t) => (t.id === trabajo.id ? trabajo : t)) || [],
			}));
		} else {
			// Es uno nuevo
			setFormData((prev) => ({
				...prev,
				Trabajos: [...(prev.Trabajos || []), trabajo],
			}));
		}
	};

	return (
		<div>
			<div className={styles.toolbar}>
				<button onClick={handleOpenAddModal} className={styles.addButton}>
					+ Agregar Trabajo
				</button>
			</div>
			<div className={styles.trabajoListContainer}>
				{formData.Trabajos && formData.Trabajos.length > 0 ? (
					formData.Trabajos.map((trabajo) => (
						<div key={trabajo.id} className={styles.trabajoItem}>
							<div className={styles.trabajoInfo}>
								<strong>{trabajo.RazonSocial || 'Sin Razón Social'}</strong>
								<span>
									{trabajo.Ocupacion
										? ocupacionOptions.find(
												(o) => o.value === trabajo.Ocupacion,
										  )?.label
										: 'Sin Ocupación'}
								</span>
							</div>
							<div className={styles.trabajoActions}>
								{/* 👇 BOTONES CON ÍCONOS SVG 👇 */}
								<button
									onClick={() => handleOpenEditModal(trabajo)}
									className={styles.editButton}
									title='Editar'
								>
									<svg
										xmlns='http://www.w3.org/2000/svg'
										fill='none'
										viewBox='0 0 24 24'
										strokeWidth={1.5}
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											d='m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125'
										/>
									</svg>
								</button>
								<button
									onClick={() => handleDelete(trabajo.id)}
									className={styles.deleteButton}
									title='Borrar'
								>
									<svg
										xmlns='http://www.w3.org/2000/svg'
										fill='none'
										viewBox='0 0 24 24'
										strokeWidth={1.5}
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											d='m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 0 0-2.09 2.134v.916m7.5 0a48.667 48.667 0 0 0-7.5 0'
										/>
									</svg>
								</button>
							</div>
						</div>
					))
				) : (
					<p className={styles.noDataText}>No hay datos laborales cargados.</p>
				)}
			</div>

			<LaboralDataModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSave={handleSave}
				initialData={editingTrabajo}
				ocupacionOptions={ocupacionOptions}
				situacionOptions={situacionOptions}
				estudiosOptions={estudiosOptions}
			/>
		</div>
	);
}
