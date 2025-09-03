// DatosLaboralesTab.tsx
import { useEffect, useMemo, useState } from 'react';
import { PatientFormData, Trabajo } from '@/src/app/types/PatientInterface';
import LaboralDataModal from './LaboralDataModal';
import CustomSelect from './LoadingSelect';
import styles from './LaboralData.module.css';
import stylesPersonal from './Personal.module.css';
import { apiService } from '@/src/app/services/axios';

interface Option {
	value: string | number;
	label: string;
}

interface DatosLaboralesTabProps {
	formData: PatientFormData;
	setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>;
}

export default function DatosLaboralesTab({ formData, setFormData }: DatosLaboralesTabProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [editingTrabajo, setEditingTrabajo] = useState<Partial<Trabajo> | null>(null);

	const [ocupacionOptions, setOcupacionOptions] = useState<Option[]>([]);
	const [situacionOptions, setSituacionOptions] = useState<Option[]>([]);
	const [estudiosOptions, setEstudiosOptions] = useState<Option[]>([]);

	useEffect(() => {
		const fetchOptions = async () => {
			const { data } = await apiService.get<{
				data: {
					ocupaciones: Array<{ Valor: number; Descripcion: string }>;
					nivelesEstudios: Array<{ NivelDeEstudios: string }>;
					situacionLaboral: Array<{ SituacionLaboral: string }>;
				};
			}>('/patients/catalogo-laboral');

			setOcupacionOptions(
				data.data.ocupaciones.map((o) => ({
					value: Number(o.Valor),
					label: o.Descripcion,
				})),
			);

			setEstudiosOptions(
				data.data.nivelesEstudios.map((e) => ({
					value: e.NivelDeEstudios,
					label: e.NivelDeEstudios,
				})),
			);

			setSituacionOptions(
				data.data.situacionLaboral.map((s) => ({
					value: s.SituacionLaboral,
					label: s.SituacionLaboral,
				})),
			);
		};

		fetchOptions();
	}, []);

	const handleOpenAddModal = () => {
		setEditingIndex(null);
		setEditingTrabajo(null);
		setIsModalOpen(true);
	};
	const handleOpenEditModal = (idx: number, trabajo: Trabajo) => {
		setEditingIndex(idx);
		setEditingTrabajo(trabajo);
		setIsModalOpen(true);
	};

	const handleDelete = (index: number) => {
		if (window.confirm('¿Estás seguro de que deseas eliminar este empleo?')) {
			setFormData((prev) => {
				const list = [...(prev.Trabajos || [])];
				if (index >= 0 && index < list.length) list.splice(index, 1);
				return { ...prev, Trabajos: list };
			});
		}
	};

	const handleSave = (trabajo: Trabajo) => {
		setFormData((prev) => {
			const list = [...(prev.Trabajos || [])];

			if (editingIndex !== null && editingIndex >= 0 && editingIndex < list.length) {
				// actualizar en su posición
				list[editingIndex] = trabajo;
			} else {
				// agregar al final
				list.push(trabajo);
			}

			return { ...prev, Trabajos: list };
		});

		setIsModalOpen(false);
		setEditingIndex(null);
		setEditingTrabajo(null);
	};

	// helper para setear formData
	const setFD = (patch: Partial<PatientFormData>) =>
		setFormData((prev) => ({ ...prev, ...patch }));

	return (
		<div className={styles.laboralDataTab}>
			{/* --- Ocupación (fuera del modal), como en la app original --- */}
			<div className={`${stylesPersonal.formRow} ${stylesPersonal.double}`}>
				<CustomSelect
					name='Ocupacion'
					label='Ocupación:'
					isLoading={!ocupacionOptions.length}
					value={Number(formData.Ocupacion)}
					onChange={(v) =>
						setFD({ Ocupacion: typeof v === 'number' ? v : Number(v) })
					}
					options={ocupacionOptions}
				/>

				{/* Toolbar + tabla de empleos */}
				<div className={styles.toolbar}>
					<button
						type='button'
						onClick={handleOpenAddModal}
						className={styles.addButton}
					>
						+ Agregar Trabajo
					</button>
				</div>
			</div>

			{formData.Trabajos && formData.Trabajos.length > 0 ? (
				<div className={styles.tableWrapper}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Razón Social</th>
								<th>Domicilio Empresa</th>
								<th>Teléfono Empresa</th>
								<th>CUIT Empresa</th>
								<th className={styles.colAcciones}>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{formData.Trabajos.map((t, idx) => (
								<tr key={idx}>
									<td>{t.RazonSocial || '-'}</td>
									<td>{t.DomicilioEmpresa || '-'}</td>
									<td>{t.TelefonoEmpresa || '-'}</td>
									<td>{t.CuitEmpresa || '-'}</td>
									<td className={styles.actionsCell}>
										<button
											type='button'
											className={styles.editButton}
											title='Editar'
											onClick={() =>
												handleOpenEditModal(idx, t as Trabajo)
											}
										>
											✎
										</button>
										<button
											type='button'
											className={styles.deleteButton}
											title='Borrar'
											onClick={() => handleDelete(idx!)}
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

			{/* Situación laboral y Nivel de estudios (fuera del modal) */}
			<div className={`${stylesPersonal.formRow} ${stylesPersonal.double}`}>
				<CustomSelect
					label='Situación laboral:'
					name='SituacionLaboral'
					isLoading={!situacionOptions.length}
					value={String(formData.SituacionLaboral || '')}
					onChange={(value) =>
						setFD({
							SituacionLaboral:
								typeof value === 'string' ? value : String(value),
						})
					}
					options={situacionOptions}
				/>
				<CustomSelect
					label='Nivel de estudios:'
					isLoading={!estudiosOptions.length}
					name='NivelEstudios'
					value={String(formData.NivelEstudios || '')}
					onChange={(value) =>
						setFD({
							NivelEstudios: typeof value === 'string' ? value : String(value),
						})
					}
					options={estudiosOptions}
				/>
			</div>

			{/* Modal sólo para los datos de la empresa */}
			<LaboralDataModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSave={handleSave}
				initialData={editingTrabajo}
			/>
		</div>
	);
}
