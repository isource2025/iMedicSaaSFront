import { useState, useEffect } from 'react';
import { PatientFormData, Trabajo } from '@/src/app/types/PatientInterface';
import LaboralDataModal from './LaboralDataModal';
import styles from './LaboralData.module.css';

interface Option {
	value: string;
	label: string;
}

interface DatosLaboralesTabProps {
	formData: PatientFormData;
	setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>;
}

export default function DatosLaboralesTab({ formData, setFormData }: DatosLaboralesTabProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingTrabajo, setEditingTrabajo] = useState<Partial<Trabajo> | null>(null);

	const [ocupacionOptions, setOcupacionOptions] = useState<Option[]>([]);
	const [situacionOptions, setSituacionOptions] = useState<Option[]>([]);
	const [estudiosOptions, setEstudiosOptions] = useState<Option[]>([]);

	useEffect(() => {
		const t = setTimeout(() => {
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
		}, 300);
		return () => clearTimeout(t);
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
			setFormData((prev) => ({
				...prev,
				Trabajos: prev.Trabajos?.map((t) => (t.id === trabajo.id ? trabajo : t)) || [],
			}));
		} else {
			setFormData((prev) => ({
				...prev,
				Trabajos: [...(prev.Trabajos || []), trabajo],
			}));
		}
		setIsModalOpen(false);
	};

	return (
		<div>
			<div className={styles.toolbar}>
				<button
					type='button'
					onClick={handleOpenAddModal}
					className={styles.addButton}
				>
					+ Agregar Trabajo
				</button>
			</div>

			{formData.Trabajos && formData.Trabajos.length > 0 ? (
				<div className={styles.tableWrapper}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Documento</th>
								<th>Razón Social</th>
								<th>Domicilio Empresa</th>
								<th>Teléfono Empresa</th>
								<th>CUIT Empresa</th>
								<th className={styles.colAcciones}>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{formData.Trabajos.map((t) => (
								<tr key={t.id}>
									<td>{t.DocumentoEmpresa || '-'}</td>
									<td>{t.RazonSocial || '-'}</td>
									<td>{t.DomicilioEmpresa || '-'}</td>
									<td>{t.TelefonoEmpresa || '-'}</td>
									<td>{t.CuitEmpresa || '-'}</td>
									<td className={styles.actionsCell}>
										<button
											type='button'
											className={styles.editButton}
											title='Editar'
											onClick={() => handleOpenEditModal(t as Trabajo)}
										>
											✎
										</button>
										<button
											type='button'
											className={styles.deleteButton}
											title='Borrar'
											onClick={() => handleDelete(t.id!)}
										>
											🗑
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className={styles.noDataText}>No hay datos laborales cargados.</p>
			)}

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
