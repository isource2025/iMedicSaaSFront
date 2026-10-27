'use client';

import { useMemo, useState } from 'react';
import type { ModuloCatalogo, SubmoduloCatalogo } from '@/app/services/rolesService';
import styles from './PersonalPermisosMatriz.module.css';

const ROTULO_ACCION: Record<string, string> = {
	VER: 'Ver',
	CREAR: 'Crear',
	EDITAR: 'Editar',
	ELIMINAR: 'Eliminar',
	GESTIONAR: 'Gestionar',
	TRASLADAR: 'Trasladar',
	APLICAR: 'Aplicar',
	EXPORTAR: 'Exportar',
	IMPRIMIR: 'Imprimir',
};

type Props = {
	catalogo: ModuloCatalogo[];
	base: string[];
	marcados: Set<string>;
	permisosActor: string[];
	disabled?: boolean;
	onChange: (next: Set<string>) => void;
};

export default function PersonalPermisosMatriz({
	catalogo,
	base,
	marcados,
	permisosActor,
	disabled = false,
	onChange,
}: Props) {
	const [busqueda, setBusqueda] = useState('');
	const [cerrados, setCerrados] = useState<Set<string>>(new Set());
	const baseSet = useMemo(() => new Set(base), [base]);
	const actorSet = useMemo(() => new Set(permisosActor), [permisosActor]);

	const filtrado = useMemo(() => {
		const t = busqueda.trim().toLowerCase();
		if (!t) return catalogo;
		return catalogo
			.map((m) => ({
				...m,
				submodulos: m.submodulos.filter(
					(s) =>
						m.label.toLowerCase().includes(t) ||
						s.label.toLowerCase().includes(t) ||
						s.descripcion.toLowerCase().includes(t) ||
						s.acciones.some(
							(a) =>
								a.descripcion.toLowerCase().includes(t) ||
								a.codigo.toLowerCase().includes(t),
						),
				),
			}))
			.filter((m) => m.submodulos.length > 0);
	}, [catalogo, busqueda]);

	const grants = useMemo(
		() => [...marcados].filter((c) => !baseSet.has(c)).length,
		[marcados, baseSet],
	);
	const denies = useMemo(
		() => base.filter((c) => !marcados.has(c)).length,
		[base, marcados],
	);

	const otorgables = (sub: SubmoduloCatalogo) =>
		sub.acciones.filter((a) => a.asignable && actorSet.has(a.codigo));

	const alternar = (codigo: string, sub: SubmoduloCatalogo) => {
		if (disabled) return;
		const next = new Set(marcados);
		const tieneVer = sub.acciones.find((a) => a.accion === 'VER');
		const info = sub.acciones.find((a) => a.codigo === codigo);
		if (!info) return;
		if (next.has(codigo)) {
			next.delete(codigo);
			if (info.accion === 'VER') sub.acciones.forEach((a) => next.delete(a.codigo));
		} else {
			next.add(codigo);
			if (info.accion !== 'VER' && tieneVer?.asignable && actorSet.has(tieneVer.codigo)) {
				next.add(tieneVer.codigo);
			}
		}
		onChange(next);
	};

	const alternarGrupo = (subs: SubmoduloCatalogo[]) => {
		if (disabled) return;
		const codigos = subs.flatMap((s) => otorgables(s).map((a) => a.codigo));
		const todos = codigos.length > 0 && codigos.every((c) => marcados.has(c));
		const next = new Set(marcados);
		codigos.forEach((c) => (todos ? next.delete(c) : next.add(c)));
		onChange(next);
	};

	const restaurarBase = () => {
		if (disabled) return;
		onChange(new Set(base));
	};

	return (
		<div className={styles.wrap}>
			<div className={styles.head}>
				<h3 className={styles.title}>Permisos individuales</h3>
				<span className={styles.meta}>
					{marcados.size} efectivos
					{grants ? ` · +${grants} extra` : ''}
					{denies ? ` · −${denies} quitados` : ''}
				</span>
			</div>
			<p className={styles.hint}>
				Parten de los roles asignados. Marcá para otorgar de más o desmarcá para quitar,
				sin inventar un rol nuevo. Los cambios aplican en el próximo ingreso (o al
				refrescar permisos).
			</p>

			<div className={styles.toolbar}>
				<input
					className={styles.search}
					placeholder='Buscar permiso o módulo…'
					value={busqueda}
					onChange={(e) => setBusqueda(e.target.value)}
					disabled={disabled}
				/>
				<button
					type='button'
					className={styles.link}
					disabled={disabled || (grants === 0 && denies === 0)}
					onClick={restaurarBase}
				>
					Volver a la base del rol
				</button>
			</div>

			{filtrado.map((m) => {
				const cerrado = cerrados.has(m.id);
				const totalMarcados = m.submodulos.reduce(
					(n, s) => n + s.acciones.filter((a) => marcados.has(a.codigo)).length,
					0,
				);
				const totalAcciones = m.submodulos.reduce((n, s) => n + s.acciones.length, 0);
				return (
					<div key={m.id} className={styles.modulo}>
						<div
							className={styles.moduloHead}
							onClick={() =>
								setCerrados((prev) => {
									const s = new Set(prev);
									if (s.has(m.id)) s.delete(m.id);
									else s.add(m.id);
									return s;
								})
							}
						>
							<span>
								{cerrado ? '▸' : '▾'} {m.label}{' '}
								<span className={styles.muted}>
									({totalMarcados}/{totalAcciones})
								</span>
							</span>
							{!disabled ? (
								<button
									type='button'
									className={styles.link}
									onClick={(e) => {
										e.stopPropagation();
										alternarGrupo(m.submodulos);
									}}
								>
									Marcar / desmarcar
								</button>
							) : null}
						</div>
						{cerrado ? null : (
							<div className={styles.moduloBody}>
								{m.submodulos.map((s) => (
									<div key={s.id} className={styles.sub}>
										<div className={styles.subTitle}>{s.label}</div>
										<p className={styles.subDesc}>{s.descripcion}</p>
										<div className={styles.acciones}>
											{s.acciones.map((a) => {
												const activo = marcados.has(a.codigo);
												const enBase = baseSet.has(a.codigo);
												const sinPermisoPropio = !actorSet.has(a.codigo);
												const bloqueado =
													disabled ||
													(!activo && (!a.asignable || sinPermisoPropio));
												const motivo = !a.asignable
													? 'Este permiso no se puede asignar individualmente'
													: sinPermisoPropio
														? 'No podés otorgar un permiso que no tenés'
														: '';
												return (
													<label
														key={a.codigo}
														className={`${styles.accion} ${
															bloqueado && !activo ? styles.accionOff : ''
														}`}
														title={bloqueado && !activo ? motivo : a.codigo}
													>
														<input
															type='checkbox'
															checked={activo}
															disabled={bloqueado}
															onChange={() => alternar(a.codigo, s)}
														/>
														<span>
															<span className={styles.accionLabel}>
																{ROTULO_ACCION[a.accion] ?? a.accion}
																{activo && !enBase ? (
																	<span className={styles.badgeExtra}>extra</span>
																) : null}
																{!activo && enBase ? (
																	<span className={styles.badgeQuit}>quitado</span>
																) : null}
															</span>
															<span className={styles.accionDesc}>
																{a.descripcion}
															</span>
														</span>
													</label>
												);
											})}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				);
			})}
			{filtrado.length === 0 ? (
				<p className={styles.muted}>Ningún permiso coincide con la búsqueda.</p>
			) : null}
		</div>
	);
}
