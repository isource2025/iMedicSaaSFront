'use client';

import { useEffect, useState } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSave } from 'react-icons/fa';
import { OpcGrd } from '@/app/types/opcGrd.types';
import { useOpcGrdManager } from '@/app/hooks/useOpcGrdManager';
import { getTablaIconSrc, getTablaIconFallback, getTablaIconColor } from '@/app/utils/tablaIcons';
import Loader from '@/app/components/Loader/Loader';
import styles from './OpcGrdTables.module.css';

type Props = {
	rubro: TablaIconRubro;
	title: string;
	description: string;
};

export default function ConfigOpcGrdTables({ rubro, title, description }: Props) {
	const { opcionesAgrupadas, loading, error, createOpcGrd, updateOpcGrd, deleteOpcGrd } =
		useOpcGrdManager();

	const [opciones, setOpciones] = useState<OpcGrd[]>([]);
	const [editingOpcion, setEditingOpcion] = useState<string | null>(null);
	const [deletingOpcion, setDeletingOpcion] = useState<string | null>(null);
	const [nuevaDescripcion, setNuevaDescripcion] = useState('');
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [createDescripcion, setCreateDescripcion] = useState('');

	useEffect(() => {
		const grupo = opcionesAgrupadas.find((g) => g.rubro.trim().toUpperCase() === rubro);
		setOpciones(grupo?.opciones ?? []);
	}, [opcionesAgrupadas, rubro]);

	const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
		e.currentTarget.src = getTablaIconFallback();
	};

	const handleSaveEdit = async (opcion: OpcGrd) => {
		if (!nuevaDescripcion.trim()) return;
		try {
			const result = await updateOpcGrd(rubro, opcion.descripcion, nuevaDescripcion);
			if (result) {
				setEditingOpcion(null);
				setNuevaDescripcion('');
			} else {
				alert('Error al actualizar la opción');
			}
		} catch (err: unknown) {
			alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	const handleConfirmDelete = async (opcion: OpcGrd) => {
		try {
			const result = await deleteOpcGrd(rubro, opcion.descripcion);
			if (result) setDeletingOpcion(null);
			else alert('Error al eliminar la opción');
		} catch (err: unknown) {
			alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	const handleCreate = async () => {
		if (!createDescripcion.trim()) return;
		try {
			const result = await createOpcGrd({
				rubro,
				descripcion: createDescripcion,
				icono: 'default.png',
				orden: opciones.length + 1,
			});
			if (result) {
				setShowCreateForm(false);
				setCreateDescripcion('');
			} else {
				alert('Error al crear la opción');
			}
		} catch (err: unknown) {
			alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div>
					<h1 className={styles.title}>{title}</h1>
					{description ? <p className={styles.description}>{description}</p> : null}
				</div>
				{!showCreateForm && (
					<button
						type="button"
						className={styles.addButton}
						onClick={() => {
							setShowCreateForm(true);
							setCreateDescripcion('');
						}}
					>
						<FaPlus size={12} /> Nueva opción
					</button>
				)}
			</div>

			{showCreateForm && (
				<div className={styles.panel}>
					<h3 className={styles.panelTitle}>Nueva opción</h3>
					<div className={styles.formGroup}>
						<label className={styles.formLabel}>Descripción</label>
						<input
							type="text"
							value={createDescripcion}
							onChange={(e) => setCreateDescripcion(e.target.value)}
							className={styles.formInput}
							placeholder="Ingrese la descripción"
						/>
					</div>
					<div className={styles.formActions}>
						<button
							type="button"
							className={styles.btnGhost}
							onClick={() => {
								setShowCreateForm(false);
								setCreateDescripcion('');
							}}
						>
							Cancelar
						</button>
						<button
							type="button"
							className={styles.btnPrimary}
							onClick={handleCreate}
							disabled={!createDescripcion.trim()}
						>
							Crear
						</button>
					</div>
				</div>
			)}

			{loading ? (
				<div className={styles.loaderWrap}>
					<Loader />
				</div>
			) : error ? (
				<div className={styles.error}>{error}</div>
			) : opciones.length === 0 ? (
				<div className={styles.empty}>No hay opciones configuradas</div>
			) : (
				<div className={styles.optionsGrid}>
					{opciones.map((opcion, index) => {
						const isEditing = editingOpcion === opcion.descripcion;
						const isDeleting = deletingOpcion === opcion.descripcion;

						if (isEditing) {
							return (
								<div key={`${opcion.descripcion}-${index}`} className={`${styles.card} ${styles.cardStatic}`}>
									<div className={styles.formGroup} style={{ width: '100%' }}>
										<label className={styles.formLabel}>Descripción</label>
										<input
											type="text"
											value={nuevaDescripcion}
											onChange={(e) => setNuevaDescripcion(e.target.value)}
											className={styles.formInput}
										/>
									</div>
									<div className={styles.formActions} style={{ width: '100%' }}>
										<button
											type="button"
											className={styles.btnGhost}
											onClick={() => {
												setEditingOpcion(null);
												setNuevaDescripcion('');
											}}
										>
											Cancelar
										</button>
										<button
											type="button"
											className={styles.btnPrimary}
											onClick={() => handleSaveEdit(opcion)}
											disabled={!nuevaDescripcion.trim()}
										>
											<FaSave size={12} /> Guardar
										</button>
									</div>
								</div>
							);
						}

						if (isDeleting) {
							return (
								<div key={`${opcion.descripcion}-${index}`} className={`${styles.card} ${styles.cardStatic}`}>
									<p className={styles.deleteText}>¿Eliminar?</p>
									<p className={styles.deleteHint}>{opcion.descripcion}</p>
									<div className={styles.formActions} style={{ width: '100%' }}>
										<button
											type="button"
											className={styles.btnGhost}
											onClick={() => setDeletingOpcion(null)}
										>
											Cancelar
										</button>
										<button
											type="button"
											className={styles.btnDanger}
											onClick={() => handleConfirmDelete(opcion)}
										>
											Eliminar
										</button>
									</div>
								</div>
							);
						}

						return (
							<div
								key={`${opcion.descripcion}-${index}`}
								className={`${styles.card} ${styles.cardStatic}`}
								style={{ ['--icon-tint' as string]: getTablaIconColor(rubro) }}
							>
								<div className={styles.iconWrap}>
									<img
										src={getTablaIconSrc(rubro, index, opciones)}
										alt=""
										className={styles.icon}
										onError={handleImageError}
									/>
								</div>
								<p className={styles.label}>{opcion.descripcion}</p>
								{!editingOpcion && !deletingOpcion && (
									<div className={styles.cardActions}>
										<button
											type="button"
											className={styles.iconBtn}
											onClick={() => {
												setEditingOpcion(opcion.descripcion);
												setNuevaDescripcion(opcion.descripcion);
											}}
											title="Editar"
										>
											<FaEdit size={13} />
										</button>
										<button
											type="button"
											className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
											onClick={() => setDeletingOpcion(opcion.descripcion)}
											title="Eliminar"
										>
											<FaTrash size={13} />
										</button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
