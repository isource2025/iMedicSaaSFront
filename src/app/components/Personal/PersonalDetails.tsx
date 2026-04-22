'use client';

import { useEffect, useState } from 'react';
import { Personal, CatalogoItemNumerico, CatalogoItemTexto } from '../../types/personal';
import { personalService } from '../../services/personalService';
import modalStyles from './PersonalActionModals.module.css';
import styles from './PersonalDetails.module.css';
import { clarionDateToDate } from '../../utils/dateUtils';

interface PersonalDetailsProps {
	personal: Personal;
	onClose: () => void;
	onEdit: () => void;
}

const formatDate = (dateString?: string | null) => {
	if (!dateString) return '-';
	let date: Date | null;
	if (/^\d+$/.test(dateString)) date = clarionDateToDate(dateString);
	else date = new Date(dateString);
	if (!date || isNaN(date.getTime())) return '-';
	return date.toLocaleDateString('es-AR');
};

const iniciales = (nombre: string) => {
	const parts = (nombre || '')
		.split(/[\s,]+/)
		.filter(Boolean)
		.slice(0, 2);
	return (parts.map((p) => p[0]).join('') || 'P').toUpperCase();
};

export default function PersonalDetails({
	personal,
	onClose,
	onEdit,
}: PersonalDetailsProps) {
	const [especialidades, setEspecialidades] = useState<CatalogoItemNumerico[]>([]);
	const [funciones, setFunciones] = useState<CatalogoItemNumerico[]>([]);
	const [servicios, setServicios] = useState<CatalogoItemTexto[]>([]);
	const [categorias, setCategorias] = useState<CatalogoItemNumerico[]>([]);
	const [clases, setClases] = useState<CatalogoItemTexto[]>([]);

	useEffect(() => {
		(async () => {
			try {
				const [esp, fn, sv, cat, cl] = await Promise.all([
					personalService.getEspecialidades(),
					personalService.getFunciones(),
					personalService.getServicios(),
					personalService.getCategorias(),
					personalService.getClases(),
				]);
				setEspecialidades(esp);
				setFunciones(fn);
				setServicios(sv);
				setCategorias(cat);
				setClases(cl);
			} catch (e) {
				console.error('catalogs details', e);
			}
		})();
	}, []);

	const descNum = (list: CatalogoItemNumerico[], val: number | null) =>
		val == null ? '-' : list.find((i) => i.valor === val)?.descripcion || String(val);
	const descTxt = (list: CatalogoItemTexto[], val: string | null) =>
		!val ? '-' : list.find((i) => i.valor === String(val).trim())?.descripcion || val;

	return (
		<div className={modalStyles.wrap}>
			<div className={styles.metaRow}>
				<div className={styles.miniAvatar} aria-hidden>
					{iniciales(personal.ApellidoNombre)}
				</div>
				<p className={`${modalStyles.muted} ${styles.metaMuted}`}>
					<strong>{personal.ApellidoNombre}</strong> — ID {personal.Valor}
				</p>
			</div>

			<div className={styles.section}>
				<div className={modalStyles.label}>Datos personales</div>
				<div className={styles.grid}>
					<div className={styles.item}>
						<div className={modalStyles.label}>ID</div>
						<div className={styles.value}>{personal.Valor}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Documento</div>
						<div className={styles.value}>
							{personal.TipoDocumento || '-'} {personal.NumeroDocumento || ''}
						</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Fecha nacimiento</div>
						<div className={styles.value}>{formatDate(personal.FechaNacimiento)}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Sexo</div>
						<div className={styles.value}>
							{personal.Sexo === 'M'
								? 'Masculino'
								: personal.Sexo === 'F'
								? 'Femenino'
								: personal.Sexo || '-'}
						</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Estado civil</div>
						<div className={styles.value}>{personal.EstadoCivil || '-'}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Nacionalidad</div>
						<div className={styles.value}>{personal.Nacionalidad || '-'}</div>
					</div>
					<div className={`${styles.item} ${styles.itemWide}`}>
						<div className={modalStyles.label}>Domicilio</div>
						<div className={styles.value}>{personal.Domicilio || '-'}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Provincia</div>
						<div className={styles.value}>{personal.Provincia ?? '-'}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Teléfono</div>
						<div className={styles.value}>{personal.Telefono || '-'}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>CUIT</div>
						<div className={styles.value}>{personal.CUIT?.trim() || '-'}</div>
					</div>
					<div className={`${styles.item} ${styles.itemWide}`}>
						<div className={modalStyles.label}>Observaciones</div>
						<div className={styles.value}>{personal.Observaciones?.trim() || '-'}</div>
					</div>
				</div>
			</div>

			<div className={styles.section}>
				<div className={modalStyles.label}>Datos profesionales</div>
				<div className={styles.grid}>
					<div className={styles.item}>
						<div className={modalStyles.label}>Matrícula provincial</div>
						<div className={styles.value}>{personal.MatriculaProvincial ?? '-'}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Matrícula nacional</div>
						<div className={styles.value}>{personal.MatriculaNacional ?? '-'}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Especialidad</div>
						<div className={styles.value}>
							{descNum(especialidades, personal.ValorEspecialidad)}
						</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Función</div>
						<div className={styles.value}>{descNum(funciones, personal.ValorFunciones)}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Servicio</div>
						<div className={styles.value}>{descTxt(servicios, personal.ValorServicio)}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Servicio (facturación)</div>
						<div className={styles.value}>{personal.ValorServicioParaFacturar || '-'}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Categoría</div>
						<div className={styles.value}>{descNum(categorias, personal.ValorCategoria)}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Clase</div>
						<div className={styles.value}>{descTxt(clases, personal.ValorClase)}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Lugar de trabajo</div>
						<div className={styles.value}>{personal.LugarTrabajo || '-'}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Lugar de cobro</div>
						<div className={styles.value}>{personal.LugarCobro || '-'}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Número de socio</div>
						<div className={styles.value}>{personal.NumeroSocio ?? '-'}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Convenio facturación</div>
						<div className={styles.value}>{personal.ConvenioFacturacion || '-'}</div>
					</div>
					<div className={styles.item}>
						<div className={modalStyles.label}>Id especialidad ME</div>
						<div className={styles.value}>{personal.IdEspecialidadME ?? '-'}</div>
					</div>
				</div>
			</div>

			<div className={modalStyles.actions}>
				<button type='button' className={modalStyles.btn} onClick={onClose}>
					Cerrar
				</button>
				<button type='button' className={modalStyles.btnPrimary} onClick={onEdit}>
					Editar
				</button>
			</div>
		</div>
	);
}
