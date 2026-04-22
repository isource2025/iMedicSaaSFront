'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	Personal,
	CatalogoItemNumerico,
	CatalogoItemTexto,
} from '../../types/personal';
import type { PersonalExtraKind } from './PersonalActionModals';
import { personalService } from '../../services/personalService';
import styles from './PersonalList.module.css';
import Pagination from '../UI/Pagination';
import Loader from '../Loader/Loader';
import {
	IoPencil,
	IoTrashOutline,
	IoEyeOutline,
	IoChevronDown,
	IoMedicalOutline,
	IoLocationOutline,
	IoBriefcaseOutline,
	IoRibbonOutline,
	IoCardOutline,
	IoBusinessOutline,
	IoImageOutline,
	IoLayersOutline,
	IoPricetagOutline,
} from 'react-icons/io5';

interface PersonalListProps {
	personalList: Personal[];
	loading: boolean;
	error: string | null;
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	onEdit: (p: Personal) => void;
	onDelete: (p: Personal) => void;
	onView: (p: Personal) => void;
	onOpenExtra?: (p: Personal, kind: PersonalExtraKind) => void;
}

export default function PersonalList({
	personalList,
	loading,
	error,
	currentPage,
	totalPages,
	onPageChange,
	onEdit,
	onDelete,
	onView,
	onOpenExtra,
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

	const mapTxt = useMemo(() => {
		const bySv = new Map(servicios.map((i) => [i.valor.trim(), i.descripcion]));
		const byCl = new Map(clases.map((i) => [i.valor.trim(), i.descripcion]));
		return { bySv, byCl };
	}, [servicios, clases]);

	const descEsp = (v: number | null) =>
		v == null ? null : mapNum.byEsp.get(v) || `#${v}`;
	const descCat = (v: number | null) =>
		v == null ? null : mapNum.byCat.get(v) || `#${v}`;
	const descSv = (v: string | null) =>
		!v ? null : mapTxt.bySv.get(String(v).trim()) || v;

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
								<td colSpan={5} className={styles.loadingContainer}>
									<Loader />
								</td>
							</tr>
						) : personalList.length === 0 ? (
							<tr>
								<td colSpan={5} className={styles.noResults}>
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
								const svDesc = descSv(p.ValorServicio);
								return (
									<tr key={p.Valor} className={styles.tableRow}>
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
													<button
														className={styles.nameButton}
														onClick={() => onView(p)}
														title='Ver detalles'
													>
														{p.ApellidoNombre}
													</button>
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
										<td className={styles.actionCell}>
											<div
												className={styles.actionToolbar}
												role='group'
												aria-label={`Acciones para ${p.ApellidoNombre}`}
											>
												<button
													type='button'
													onClick={() => onView(p)}
													className={styles.historyButton}
													title='Ver detalles'
													aria-label={`Ver detalles de ${p.ApellidoNombre}`}
												>
													<IoEyeOutline size={17} />
												</button>
												<button
													type='button'
													onClick={() => onEdit(p)}
													className={styles.editButton}
													title='Editar'
													aria-label={`Editar ${p.ApellidoNombre}`}
												>
													<IoPencil size={17} />
												</button>
												<button
													type='button'
													onClick={() => onDelete(p)}
													className={styles.deleteButton}
													title='Eliminar'
													aria-label={`Eliminar ${p.ApellidoNombre}`}
												>
													<IoTrashOutline size={17} />
												</button>
												{onOpenExtra ? (
													<>
														<button
															type='button'
															className={styles.extraActionBtn}
															title='Servicio / facturación'
															aria-label={`Servicio ${p.ApellidoNombre}`}
															onClick={() => onOpenExtra(p, 'servicio')}
														>
															<IoBriefcaseOutline size={16} />
														</button>
														<button
															type='button'
															className={styles.extraActionBtn}
															title='Empresas'
															aria-label={`Empresas ${p.ApellidoNombre}`}
															onClick={() => onOpenExtra(p, 'empresas')}
														>
															<IoBusinessOutline size={16} />
														</button>
														<button
															type='button'
															className={styles.extraActionBtn}
															title='Firma'
															aria-label={`Firma ${p.ApellidoNombre}`}
															onClick={() => onOpenExtra(p, 'firma')}
														>
															<IoImageOutline size={16} />
														</button>
														<button
															type='button'
															className={styles.extraActionBtn}
															title='Sectores'
															aria-label={`Sectores ${p.ApellidoNombre}`}
															onClick={() => onOpenExtra(p, 'sectores')}
														>
															<IoLayersOutline size={16} />
														</button>
														<button
															type='button'
															className={styles.extraActionBtn}
															title='Códigos de facturación'
															aria-label={`Códigos facturación ${p.ApellidoNombre}`}
															onClick={() => onOpenExtra(p, 'codigosFacturacion')}
														>
															<IoPricetagOutline size={16} />
														</button>
													</>
												) : null}
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
								<button
									className={styles.mobileItemHeader}
									onClick={() => toggleExpand(p.Valor)}
									aria-expanded={isOpen}
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
										</div>
									</div>
									<IoChevronDown
										size={14}
										className={`${styles.mobileChevron} ${
											isOpen ? styles.mobileChevronOpen : ''
										}`}
									/>
								</button>
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
										{descSv(p.ValorServicio) ? (
											<div className={styles.mobileDetail}>
												<span className={styles.mobileDetailLabel}>Servicio</span>
												<span>{descSv(p.ValorServicio)}</span>
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
									<div
										className={styles.mobileActionToolbar}
										role='group'
										aria-label={`Acciones para ${p.ApellidoNombre}`}
									>
										<button
											type='button'
											onClick={() => onView(p)}
											className={styles.historyButton}
											title='Ver detalles'
										>
											<IoEyeOutline size={16} />
										</button>
										<button
											type='button'
											onClick={() => onEdit(p)}
											className={styles.editButton}
											title='Editar'
										>
											<IoPencil size={16} />
										</button>
										<button
											type='button'
											onClick={() => onDelete(p)}
											className={styles.deleteButton}
											title='Eliminar'
										>
											<IoTrashOutline size={16} />
										</button>
										{onOpenExtra ? (
											<>
												<button
													type='button'
													className={styles.extraActionBtn}
													title='Servicio'
													onClick={() => onOpenExtra(p, 'servicio')}
												>
													<IoBriefcaseOutline size={15} />
												</button>
												<button
													type='button'
													className={styles.extraActionBtn}
													title='Empresas'
													onClick={() => onOpenExtra(p, 'empresas')}
												>
													<IoBusinessOutline size={15} />
												</button>
												<button
													type='button'
													className={styles.extraActionBtn}
													title='Firma'
													onClick={() => onOpenExtra(p, 'firma')}
												>
													<IoImageOutline size={15} />
												</button>
												<button
													type='button'
													className={styles.extraActionBtn}
													title='Sectores'
													onClick={() => onOpenExtra(p, 'sectores')}
												>
													<IoLayersOutline size={15} />
												</button>
												<button
													type='button'
													className={styles.extraActionBtn}
													title='Códigos facturación'
													onClick={() => onOpenExtra(p, 'codigosFacturacion')}
												>
													<IoPricetagOutline size={15} />
												</button>
											</>
										) : null}
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
