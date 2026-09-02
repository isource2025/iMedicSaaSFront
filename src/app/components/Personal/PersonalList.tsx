'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	Personal,
	CatalogoItemNumerico,
	CatalogoItemTexto,
} from '../../types/personal';
import { personalService } from '../../services/personalService';
import { etiquetaCatalogo, mapaCatalogoTexto } from '../../utils/etiquetaCatalogo';
import styles from './PersonalList.module.css';
import Pagination from '../UI/Pagination';
import Loader from '../Loader/Loader';
import {
	IoChevronDown,
	IoMedicalOutline,
	IoLocationOutline,
	IoBriefcaseOutline,
	IoRibbonOutline,
	IoCardOutline,
	IoEllipsisVertical,
	IoEyeOutline,
	IoPencil,
	IoTrashOutline,
} from 'react-icons/io5';

interface PersonalListProps {
	personalList: Personal[];
	loading: boolean;
	error: string | null;
	currentPage: number;
	totalPages: number;
	onEdit: (p: Personal) => void;
	onView: (p: Personal) => void;
	onDelete: (p: Personal) => void;
	onOpenMenu: (p: Personal, anchor?: { x: number; y: number }) => void;
	onPageChange: (page: number) => void;
}

export default function PersonalList({
	personalList,
	loading,
	error,
	currentPage,
	totalPages,
	onPageChange,
	onEdit,
	onView,
	onDelete,
	onOpenMenu,
}: PersonalListProps) {
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [especialidades, setEspecialidades] = useState<CatalogoItemNumerico[]>([]);
	const [servicios, setServicios] = useState<CatalogoItemTexto[]>([]);
	const [categorias, setCategorias] = useState<CatalogoItemNumerico[]>([]);
	const [clases, setClases] = useState<CatalogoItemTexto[]>([]);

	useEffect(() => {
		(async () => {
			try {
				const [esp, sv, cat, cl] = await Promise.all([
					personalService.getEspecialidades(),
					personalService.getServicios(),
					personalService.getCategorias(),
					personalService.getClases(),
				]);
				setEspecialidades(esp);
				setServicios(sv);
				setCategorias(cat);
				setClases(cl);
			} catch (e) {
				console.error('catalogos list', e);
			}
		})();
	}, []);

	const mapNum = useMemo(() => {
		const byEsp = new Map(especialidades.map((i) => [i.valor, i.descripcion]));
		const byCat = new Map(categorias.map((i) => [i.valor, i.descripcion]));
		return { byEsp, byCat };
	}, [especialidades, categorias]);

	const mapSv = useMemo(() => mapaCatalogoTexto(servicios), [servicios]);

	const descEsp = (v: number | null) =>
		v == null ? null : mapNum.byEsp.get(v) || null;
	const descCat = (v: number | null) =>
		v == null ? null : mapNum.byCat.get(v) || null;
	const descSv = (p: Personal) =>
		etiquetaCatalogo(mapSv, p.ValorServicio, p.ServicioDescripcion) || null;

	const toggleExpand = (id: number) =>
		setExpandedId((prev) => (prev === id ? null : id));

	const iniciales = (nombre: string) => {
		const parts = (nombre || '')
			.split(/[\s,]+/)
			.filter(Boolean)
			.slice(0, 2);
		return (parts.map((p) => p[0]).join('') || 'P').toUpperCase();
	};

	const renderEstadoBadge = (estado: number | null) => {
		const activo = estado == null || estado === 1;
		return (
			<span
				className={`${styles.estadoBadge} ${
					activo ? styles.estadoActivo : styles.estadoInactivo
				}`}
			>
				<span className={styles.estadoDot} />
				{activo ? 'Activo' : 'Inactivo'}
			</span>
		);
	};

	const hasDocumento = (p: Personal) =>
		(p.TipoDocumento != null && String(p.TipoDocumento).trim() !== '') ||
		p.NumeroDocumento != null;

	return (
		<div className={styles.container}>
			{error && (
				<div className={styles.errorContainer} role='alert'>
					<strong>Error!</strong> <span>{error}</span>
				</div>
			)}

			<div className={styles.tableContainer}>
				<table className={styles.table} aria-label='Lista de personal'>
					<thead className={styles.tableHeader}>
						<tr>
							<th scope='col' className={styles.colId}>ID / Matrícula</th>
							<th scope='col' className={styles.colPerson}>Apellido y Nombre</th>
							<th scope='col'>Especialidad / Categoría</th>
							<th scope='col'>Servicio</th>
							<th scope='col'>Estado</th>
							<th scope='col' className={styles.colActions}>Acciones</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={6} className={styles.loadingContainer}>
									<Loader />
								</td>
							</tr>
						) : personalList.length === 0 ? (
							<tr>
								<td colSpan={6} className={styles.noResults}>
									No se encontró personal
								</td>
							</tr>
						) : (
							personalList.map((p) => {
								const matricula =
									p.MatriculaProvincial && p.MatriculaProvincial !== p.Valor
										? p.MatriculaProvincial
										: null;
								const espDesc = descEsp(p.ValorEspecialidad);
								const catDesc = descCat(p.ValorCategoria);
								const svDesc = descSv(p);
								return (
									<tr
										key={p.Valor}
										className={styles.tableRow}
										onClick={() => onView(p)}
										style={{ cursor: 'pointer' }}
										title='Ver detalle'
									>
										<td className={styles.cellId}>
											<div className={styles.idPrimary}>{p.Valor}</div>
											{matricula && (
												<div className={styles.idSecondary}>MP {matricula}</div>
											)}
										</td>
										<td className={styles.cellPerson}>
											<div className={styles.personRow}>
												<div className={styles.avatar}>
													{iniciales(p.ApellidoNombre)}
												</div>
												<div className={styles.personInfo}>
													<span className={styles.nameText}>
														{p.ApellidoNombre}
													</span>
													<div className={styles.secondaryLine}>
														<IoLocationOutline size={12} />
														<span className={styles.secondaryText}>
															{p.Domicilio || '—'}
														</span>
													</div>
													{hasDocumento(p) ? (
														<div className={styles.secondaryLine}>
															<IoCardOutline size={12} />
															<span className={styles.secondaryText}>
																{p.TipoDocumento || 'DNI'}{' '}
																{p.NumeroDocumento ?? '—'}
															</span>
														</div>
													) : null}
												</div>
											</div>
										</td>
										<td className={styles.cellStacked}>
											<div className={styles.cellMain}>
												<IoMedicalOutline size={12} className={styles.cellIcon} />
												<span
													className={`${styles.cellText} ${
														espDesc ? '' : styles.cellMuted
													}`}
												>
													{espDesc || '—'}
												</span>
											</div>
											<div className={styles.cellSub}>
												<IoRibbonOutline size={12} className={styles.cellIcon} />
												<span
													className={`${styles.cellSubText} ${
														catDesc ? '' : styles.cellMuted
													}`}
												>
													{catDesc || '—'}
												</span>
											</div>
										</td>
										<td className={styles.cellStacked}>
											<div className={styles.cellMain}>
												<IoBriefcaseOutline size={12} className={styles.cellIcon} />
												<span
													className={`${styles.cellText} ${
														svDesc ? '' : styles.cellMuted
													}`}
												>
													{svDesc || '—'}
												</span>
											</div>
										</td>
										<td>{renderEstadoBadge(p.Estado)}</td>
										<td className={styles.actionCell} onClick={(e) => e.stopPropagation()}>
											<div className={styles.actionToolbar}>
												<button
													type='button'
													className={styles.extraActionBtn}
													title='Ver detalle'
													aria-label={`Ver ${p.ApellidoNombre}`}
													onClick={() => onView(p)}
												>
													<IoEyeOutline size={16} />
												</button>
												<button
													type='button'
													className={styles.editButton}
													title='Editar'
													aria-label={`Editar ${p.ApellidoNombre}`}
													onClick={() => onEdit(p)}
												>
													<IoPencil size={16} />
												</button>
												<button
													type='button'
													className={styles.extraActionBtn}
													title='Más opciones'
													aria-label={`Opciones de ${p.ApellidoNombre}`}
													onClick={(e) =>
														onOpenMenu(p, { x: e.clientX, y: e.clientY })
													}
												>
													<IoEllipsisVertical size={18} />
												</button>
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			<div className={styles.mobileList}>
				{loading ? (
					<div style={{ position: 'relative', minHeight: '200px' }}>
						<Loader />
					</div>
				) : personalList.length === 0 ? (
					<div className={styles.noResults}>No se encontró personal</div>
				) : (
					personalList.map((p) => {
						const isOpen = expandedId === p.Valor;
						const matricula =
							p.MatriculaProvincial && p.MatriculaProvincial !== p.Valor
								? p.MatriculaProvincial
								: null;
						return (
							<div
								key={p.Valor}
								className={`${styles.mobileItem} ${
									isOpen ? styles.mobileItemOpen : ''
								}`}
							>
								<div className={styles.mobileItemHeader}>
									<button
										type='button'
										className={styles.mobileItemMain}
										onClick={() => toggleExpand(p.Valor)}
										aria-expanded={isOpen}
										aria-label={`Detalle de ${p.ApellidoNombre}`}
									>
										<div className={styles.avatar}>{iniciales(p.ApellidoNombre)}</div>
										<div className={styles.mobileItemLeft}>
											<div className={styles.mobileItemName}>
												{p.ApellidoNombre}
											</div>
											<div className={styles.mobileItemTags}>
												<span className={styles.mobileTag}>
													<span className={styles.mobileTagLabel}>ID</span> {p.Valor}
												</span>
												{matricula ? (
													<span className={styles.mobileTag}>
														<span className={styles.mobileTagLabel}>MP</span>{' '}
														{matricula}
													</span>
												) : null}
												{descEsp(p.ValorEspecialidad) ? (
													<span className={styles.mobileTagAccent}>
														{descEsp(p.ValorEspecialidad)}
													</span>
												) : null}
												{renderEstadoBadge(p.Estado)}
											</div>
										</div>
									</button>
									<button
										type='button'
										className={styles.mobileMenuBtn}
										onClick={() => onOpenMenu(p)}
										aria-label={`Opciones de ${p.ApellidoNombre}`}
									>
										<IoEllipsisVertical size={20} />
									</button>
									<button
										type='button'
										className={styles.mobileExpandBtn}
										onClick={() => toggleExpand(p.Valor)}
										aria-expanded={isOpen}
										aria-label={isOpen ? 'Ocultar detalle' : 'Ver detalle'}
									>
										<IoChevronDown
											size={14}
											className={`${styles.mobileChevron} ${
												isOpen ? styles.mobileChevronOpen : ''
											}`}
										/>
									</button>
								</div>
								<div
									className={`${styles.mobileItemBody} ${
										isOpen ? styles.mobileItemBodyOpen : ''
									}`}
								>
									<div className={styles.mobileDetailGrid}>
										{hasDocumento(p) ? (
											<div className={styles.mobileDetail}>
												<span className={styles.mobileDetailLabel}>Doc.</span>
												<span>
													{p.TipoDocumento || 'DNI'} {p.NumeroDocumento ?? '—'}
												</span>
											</div>
										) : null}
										{p.Domicilio ? (
											<div className={styles.mobileDetail}>
												<span className={styles.mobileDetailLabel}>Dir.</span>
												<span>{p.Domicilio}</span>
											</div>
										) : null}
										{descSv(p) ? (
											<div className={styles.mobileDetail}>
												<span className={styles.mobileDetailLabel}>Servicio</span>
												<span>{descSv(p)}</span>
											</div>
										) : null}
										{descCat(p.ValorCategoria) ? (
											<div className={styles.mobileDetail}>
												<span className={styles.mobileDetailLabel}>Categ.</span>
												<span>{descCat(p.ValorCategoria)}</span>
											</div>
										) : null}
										<div className={styles.mobileDetail}>
											<span className={styles.mobileDetailLabel}>Estado</span>
											{renderEstadoBadge(p.Estado)}
										</div>
									</div>
									<div className={styles.mobileActionToolbar}>
										<button
											type='button'
											className={styles.historyButton}
											title='Ver detalle'
											onClick={() => onView(p)}
										>
											<IoEyeOutline size={18} />
										</button>
										<button
											type='button'
											className={styles.editButton}
											title='Editar'
											onClick={() => onEdit(p)}
										>
											<IoPencil size={16} />
										</button>
										<button
											type='button'
											className={styles.deleteButton}
											title='Eliminar'
											onClick={() => onDelete(p)}
										>
											<IoTrashOutline size={16} />
										</button>
										<button
											type='button'
											className={styles.mobileMoreBtn}
											onClick={() => onOpenMenu(p)}
										>
											Más opciones
										</button>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			{!loading && personalList.length > 0 && (
				<Pagination
					currentPage={currentPage}
					totalPages={totalPages}
					onPageChange={onPageChange}
				/>
			)}
		</div>
	);
}
