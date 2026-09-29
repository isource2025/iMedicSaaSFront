'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePermiso } from '@/app/hooks/usePermiso';
import {
	rolesService,
	type EventoAuditoriaRol,
	type MatrizRoles,
	type ModuloCatalogo,
	type RolMatriz,
	type SubmoduloCatalogo,
	type UsuarioDeRol,
} from '@/app/services/rolesService';
import { mensajeDeError } from '@/app/utils/apiError';
import styles from './permisos.module.css';

type Pestania = 'permisos' | 'usuarios' | 'historial';

interface Borrador {
	nombre: string;
	descripcion: string;
	permisos: Set<string>;
}

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

const ROTULO_EVENTO: Record<string, string> = {
	CREAR: 'Creó el rol',
	DUPLICAR: 'Creó el rol (duplicado)',
	EDITAR: 'Modificó el rol',
	ELIMINAR: 'Eliminó el rol',
};

function borradorDe(rol: RolMatriz | null): Borrador {
	return {
		nombre: rol?.nombre ?? '',
		descripcion: rol?.descripcion ?? '',
		permisos: new Set(rol?.permisos ?? []),
	};
}

function mismosPermisos(a: Set<string>, b: string[]): boolean {
	if (a.size !== b.length) return false;
	return b.every((c) => a.has(c));
}

function resumenEvento(e: EventoAuditoriaRol): string {
	const d = (e.detalle || {}) as {
		nombre?: { de: string; a: string } | string;
		permisos?: { agregados?: string[]; quitados?: string[] } | string[];
	};
	const partes: string[] = [];
	if (e.accion === 'EDITAR') {
		if (d.nombre && typeof d.nombre === 'object') partes.push(`nombre: "${d.nombre.de}" → "${d.nombre.a}"`);
		const p = d.permisos as { agregados?: string[]; quitados?: string[] } | undefined;
		if (p?.agregados?.length) partes.push(`+${p.agregados.length} permiso${p.agregados.length === 1 ? '' : 's'}`);
		if (p?.quitados?.length) partes.push(`−${p.quitados.length} permiso${p.quitados.length === 1 ? '' : 's'}`);
	} else if (Array.isArray(d.permisos)) {
		partes.push(`${d.permisos.length} permiso${d.permisos.length === 1 ? '' : 's'}`);
	}
	return partes.join(' · ');
}

export default function MatrizPermisosPage() {
	const { puede, loaded } = usePermiso();
	const puedeVer = puede('CONFIGURACION.ROLES.VER');
	const puedeCrear = puede('CONFIGURACION.ROLES.CREAR');
	const puedeEditar = puede('CONFIGURACION.ROLES.EDITAR');
	const puedeEliminar = puede('CONFIGURACION.ROLES.ELIMINAR');

	const [data, setData] = useState<MatrizRoles | null>(null);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState('');
	const [aviso, setAviso] = useState('');
	const [ocupado, setOcupado] = useState(false);

	const [seleccionId, setSeleccionId] = useState<number | null>(null);
	const [borrador, setBorrador] = useState<Borrador>(borradorDe(null));
	const [pestania, setPestania] = useState<Pestania>('permisos');
	const [busqueda, setBusqueda] = useState('');
	const [cerrados, setCerrados] = useState<Set<string>>(new Set());

	const [usuarios, setUsuarios] = useState<UsuarioDeRol[] | null>(null);
	const [historial, setHistorial] = useState<EventoAuditoriaRol[] | null>(null);

	const [modalNuevo, setModalNuevo] = useState(false);
	const [nuevo, setNuevo] = useState({ nombre: '', descripcion: '', origen: '' });

	const roles = useMemo(
		() => (data ? [...data.sistema, ...data.personalizados] : []),
		[data],
	);
	const seleccionado = useMemo(
		() => roles.find((r) => r.idRol === seleccionId) ?? null,
		[roles, seleccionId],
	);
	const permisosActor = useMemo(() => new Set(data?.permisosActor ?? []), [data]);

	const editable = !!seleccionado?.editable && puedeEditar;

	const sucio = useMemo(() => {
		if (!seleccionado || !seleccionado.editable) return false;
		return (
			borrador.nombre.trim() !== seleccionado.nombre ||
			borrador.descripcion.trim() !== (seleccionado.descripcion || '') ||
			!mismosPermisos(borrador.permisos, seleccionado.permisos)
		);
	}, [borrador, seleccionado]);

	// ─── Carga ────────────────────────────────────────────────────────────
	const cargar = useCallback(async (idParaSeleccionar?: number | null) => {
		setCargando(true);
		setError('');
		try {
			const m = await rolesService.matriz();
			setData(m);
			const todos = [...m.sistema, ...m.personalizados];
			setSeleccionId((actual) => {
				const pedido = idParaSeleccionar ?? actual;
				if (pedido != null && todos.some((r) => r.idRol === pedido)) return pedido;
				return todos[0]?.idRol ?? null;
			});
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo cargar la matriz de permisos'));
		} finally {
			setCargando(false);
		}
	}, []);

	useEffect(() => {
		if (loaded && puedeVer) void cargar();
		else if (loaded) setCargando(false);
	}, [loaded, puedeVer, cargar]);

	// Al cambiar de rol (o recargar datos) se rehace el borrador
	useEffect(() => {
		setBorrador(borradorDe(seleccionado));
		setUsuarios(null);
		setHistorial(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [seleccionId, data]);

	useEffect(() => {
		if (!seleccionado) return;
		let vivo = true;
		if (pestania === 'usuarios' && usuarios === null) {
			rolesService
				.usuariosDeRol(seleccionado.idRol)
				.then((u) => vivo && setUsuarios(u))
				.catch(() => vivo && setUsuarios([]));
		}
		if (pestania === 'historial' && historial === null && !seleccionado.esSistema) {
			rolesService
				.auditoriaDeRol(seleccionado.idRol)
				.then((h) => vivo && setHistorial(h))
				.catch(() => vivo && setHistorial([]));
		}
		return () => {
			vivo = false;
		};
	}, [pestania, seleccionado, usuarios, historial]);

	// Aviso del navegador si se sale con cambios sin guardar
	useEffect(() => {
		if (!sucio) return;
		const f = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = '';
		};
		window.addEventListener('beforeunload', f);
		return () => window.removeEventListener('beforeunload', f);
	}, [sucio]);

	// ─── Acciones ─────────────────────────────────────────────────────────
	const seleccionar = (id: number) => {
		if (id === seleccionId) return;
		if (sucio && !window.confirm('Hay cambios sin guardar. ¿Descartarlos?')) return;
		setAviso('');
		setSeleccionId(id);
	};

	const alternar = (codigo: string, sub: SubmoduloCatalogo) => {
		if (!editable) return;
		setBorrador((b) => {
			const permisos = new Set(b.permisos);
			const tieneVer = sub.acciones.find((a) => a.accion === 'VER');
			const info = sub.acciones.find((a) => a.codigo === codigo);
			if (!info) return b;
			if (permisos.has(codigo)) {
				permisos.delete(codigo);
				// Sin "Ver" no tiene sentido el resto del submódulo
				if (info.accion === 'VER') sub.acciones.forEach((a) => permisos.delete(a.codigo));
			} else {
				permisos.add(codigo);
				if (info.accion !== 'VER' && tieneVer && tieneVer.asignable && permisosActor.has(tieneVer.codigo)) {
					permisos.add(tieneVer.codigo);
				}
			}
			return { ...b, permisos };
		});
	};

	const otorgables = (sub: SubmoduloCatalogo) =>
		sub.acciones.filter((a) => a.asignable && permisosActor.has(a.codigo));

	const alternarGrupo = (subs: SubmoduloCatalogo[]) => {
		if (!editable) return;
		setBorrador((b) => {
			const codigos = subs.flatMap((s) => otorgables(s).map((a) => a.codigo));
			const todos = codigos.length > 0 && codigos.every((c) => b.permisos.has(c));
			const permisos = new Set(b.permisos);
			codigos.forEach((c) => (todos ? permisos.delete(c) : permisos.add(c)));
			return { ...b, permisos };
		});
	};

	const guardar = async () => {
		if (!seleccionado) return;
		setOcupado(true);
		setError('');
		setAviso('');
		try {
			const r = await rolesService.actualizarRol(seleccionado.idRol, {
				nombre: borrador.nombre,
				descripcion: borrador.descripcion,
				permisos: Array.from(borrador.permisos),
			});
			await cargar(seleccionado.idRol);
			setAviso(
				r.sinCambios
					? 'No había cambios para guardar.'
					: 'Rol guardado. Los usuarios con este rol verán los cambios en su próxima carga (máx. unos minutos).',
			);
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo guardar el rol'));
		} finally {
			setOcupado(false);
		}
	};

	const descartar = () => setBorrador(borradorDe(seleccionado));

	const eliminar = async () => {
		if (!seleccionado || !seleccionado.editable) return;
		if (!window.confirm(`¿Eliminar el rol "${seleccionado.nombre}"? Esta acción no se puede deshacer.`)) return;
		setOcupado(true);
		setError('');
		try {
			await rolesService.eliminarRol(seleccionado.idRol);
			setSeleccionId(null);
			await cargar(null);
			setAviso('Rol eliminado.');
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo eliminar el rol'));
		} finally {
			setOcupado(false);
		}
	};

	const abrirNuevo = (origen = '') => {
		if (sucio && !window.confirm('Hay cambios sin guardar. ¿Descartarlos?')) return;
		const base = roles.find((r) => String(r.idRol) === origen);
		setNuevo({ nombre: base ? `${base.nombre} (copia)` : '', descripcion: base?.descripcion ?? '', origen });
		setModalNuevo(true);
	};

	const crear = async () => {
		setOcupado(true);
		setError('');
		try {
			const creado = nuevo.origen
				? await rolesService.duplicarRol(Number(nuevo.origen), {
						nombre: nuevo.nombre,
						descripcion: nuevo.descripcion,
					})
				: await rolesService.crearRol({ nombre: nuevo.nombre, descripcion: nuevo.descripcion, permisos: [] });
			setModalNuevo(false);
			setPestania('permisos');
			await cargar(creado.idRol);
			setAviso(`Rol "${creado.nombre}" creado. Marcá los permisos que corresponda y guardá.`);
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo crear el rol'));
		} finally {
			setOcupado(false);
		}
	};

	// ─── Catálogo filtrado ────────────────────────────────────────────────
	const catalogo: ModuloCatalogo[] = useMemo(() => {
		const t = busqueda.trim().toLowerCase();
		const base = data?.catalogo ?? [];
		if (!t) return base;
		return base
			.map((m) => ({
				...m,
				submodulos: m.submodulos.filter(
					(s) =>
						m.label.toLowerCase().includes(t) ||
						s.label.toLowerCase().includes(t) ||
						s.descripcion.toLowerCase().includes(t) ||
						s.acciones.some((a) => a.descripcion.toLowerCase().includes(t) || a.codigo.toLowerCase().includes(t)),
				),
			}))
			.filter((m) => m.submodulos.length > 0);
	}, [data, busqueda]);

	const marcadoDe = (r: RolMatriz | null) => (editable && r?.editable ? borrador.permisos : new Set(r?.permisos ?? []));
	const marcados = marcadoDe(seleccionado);

	// ─── Render ───────────────────────────────────────────────────────────
	if (!loaded || cargando) {
		return (
			<div className={styles.page}>
				<p className={styles.muted}>Cargando…</p>
			</div>
		);
	}

	if (!puedeVer) {
		return (
			<div className={styles.page}>
				<div className={`${styles.banner} ${styles.bannerError}`}>
					No tenés permiso para ver la matriz de permisos.
				</div>
			</div>
		);
	}

	const puedeCrearRoles = puedeCrear && !!data?.soportaPersonalizados;

	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<h1>Matriz de permisos</h1>
				<p>
					Roles de la clínica y los permisos que otorga cada uno. Los roles del sistema son de sólo lectura:
					duplicalos para armar uno a medida.
				</p>
			</header>

			{error ? <div className={`${styles.banner} ${styles.bannerError}`}>{error}</div> : null}
			{aviso ? <div className={`${styles.banner} ${styles.bannerOk}`}>{aviso}</div> : null}
			{data && !data.soportaPersonalizados ? (
				<div className={`${styles.banner} ${styles.bannerInfo}`}>
					La creación de roles personalizados no está disponible en este entorno. Podés consultar los roles del
					sistema.
				</div>
			) : null}

			<div className={styles.layout}>
				{/* ── Lista de roles ─────────────────────────────── */}
				<aside className={styles.panel}>
					<button
						type="button"
						className={`${styles.btn} ${styles.btnPrimary}`}
						style={{ width: '100%' }}
						disabled={!puedeCrearRoles || ocupado}
						title={puedeCrearRoles ? '' : 'No disponible'}
						onClick={() => abrirNuevo('')}
					>
						+ Nuevo rol
					</button>

					<div className={styles.sideTitle}>Roles personalizados</div>
					{data?.personalizados.length ? (
						data.personalizados.map((r) => (
							<button
								key={r.idRol}
								type="button"
								className={`${styles.roleItem} ${r.idRol === seleccionId ? styles.roleItemActive : ''}`}
								onClick={() => seleccionar(r.idRol)}
							>
								<span className={styles.roleName}>{r.nombre}</span>
								<span className={styles.roleMeta}>{r.usuarios} usr.</span>
							</button>
						))
					) : (
						<p className={styles.muted}>Todavía no creaste roles propios.</p>
					)}

					<div className={styles.sideTitle}>Roles del sistema</div>
					{data?.sistema.map((r) => (
						<button
							key={r.idRol}
							type="button"
							className={`${styles.roleItem} ${r.idRol === seleccionId ? styles.roleItemActive : ''}`}
							onClick={() => seleccionar(r.idRol)}
						>
							<span className={styles.roleName}>{r.nombre}</span>
							<span className={styles.roleMeta}>{r.usuarios} usr.</span>
						</button>
					))}
				</aside>

				{/* ── Detalle ────────────────────────────────────── */}
				<section className={styles.panel}>
					{!seleccionado ? (
						<p className={styles.muted}>Seleccioná un rol.</p>
					) : (
						<>
							<div className={styles.roleHead}>
								<div className={styles.fields}>
									<label className={styles.field}>
										Nombre
										<input
											className={styles.input}
											value={borrador.nombre}
											disabled={!editable}
											maxLength={50}
											onChange={(e) => setBorrador((b) => ({ ...b, nombre: e.target.value }))}
										/>
									</label>
									<label className={styles.field}>
										Descripción
										<input
											className={styles.input}
											value={borrador.descripcion}
											disabled={!editable}
											maxLength={200}
											onChange={(e) => setBorrador((b) => ({ ...b, descripcion: e.target.value }))}
										/>
									</label>
								</div>
								<div className={styles.actions}>
									<button
										type="button"
										className={styles.btn}
										disabled={!puedeCrearRoles || ocupado || seleccionado.nombre.toUpperCase() === 'SUPER_ADMIN'}
										onClick={() => abrirNuevo(String(seleccionado.idRol))}
									>
										Duplicar
									</button>
									{seleccionado.editable ? (
										<button
											type="button"
											className={`${styles.btn} ${styles.btnDanger}`}
											disabled={!puedeEliminar || ocupado}
											onClick={() => void eliminar()}
										>
											Eliminar
										</button>
									) : null}
								</div>
							</div>

							{seleccionado.esSistema ? (
								<div className={`${styles.banner} ${styles.bannerInfo}`}>
									Rol del sistema: sólo lectura. Usá «Duplicar» para crear una versión editable.
								</div>
							) : !puedeEditar ? (
								<div className={`${styles.banner} ${styles.bannerInfo}`}>
									No tenés permiso para editar roles: podés consultarlos pero no modificarlos.
								</div>
							) : null}

							<div className={styles.tabs}>
								{(['permisos', 'usuarios', 'historial'] as Pestania[]).map((p) => (
									<button
										key={p}
										type="button"
										className={`${styles.tab} ${pestania === p ? styles.tabActive : ''}`}
										onClick={() => setPestania(p)}
									>
										{p === 'permisos' ? 'Permisos' : p === 'usuarios' ? `Usuarios (${seleccionado.usuarios})` : 'Historial'}
									</button>
								))}
							</div>

							{pestania === 'permisos' ? (
								<>
									<div className={styles.toolbar}>
										<input
											className={styles.input}
											style={{ minWidth: 260 }}
											placeholder="Buscar permiso o módulo…"
											value={busqueda}
											onChange={(e) => setBusqueda(e.target.value)}
										/>
										<span className={styles.counter}>{marcados.size} permisos otorgados</span>
									</div>

									{catalogo.map((m) => {
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
													{editable ? (
														<button
															type="button"
															className={styles.btnLink}
															onClick={(e) => {
																e.stopPropagation();
																alternarGrupo(m.submodulos);
															}}
														>
															Marcar / desmarcar todo
														</button>
													) : null}
												</div>
												{cerrado ? null : (
													<div className={styles.moduloBody}>
														{m.submodulos.map((s) => (
															<div key={s.id} className={styles.sub}>
																<div className={styles.subHead}>
																	<span className={styles.subTitle}>{s.label}</span>
																	{editable ? (
																		<button
																			type="button"
																			className={styles.btnLink}
																			disabled={otorgables(s).length === 0}
																			onClick={() => alternarGrupo([s])}
																		>
																			Todo
																		</button>
																	) : null}
																</div>
																<p className={styles.subDesc}>{s.descripcion}</p>
																<div className={styles.acciones}>
																	{s.acciones.map((a) => {
																		const activo = marcados.has(a.codigo);
																		const sinPermisoPropio = !permisosActor.has(a.codigo);
																		const bloqueado =
																			!editable || (!activo && (!a.asignable || sinPermisoPropio));
																		const motivo = !a.asignable
																			? 'Este permiso no se puede asignar a roles personalizados'
																			: sinPermisoPropio
																				? 'No podés otorgar un permiso que no tenés'
																				: '';
																		return (
																			<label
																				key={a.codigo}
																				className={`${styles.accion} ${bloqueado && !activo ? styles.accionOff : ''}`}
																				title={editable && bloqueado ? motivo : a.codigo}
																			>
																				<input
																					type="checkbox"
																					checked={activo}
																					disabled={bloqueado}
																					onChange={() => alternar(a.codigo, s)}
																				/>
																				<span>
																					<span className={styles.accionLabel}>
																						{ROTULO_ACCION[a.accion] ?? a.accion}
																					</span>
																					<span className={styles.accionDesc}>{a.descripcion}</span>
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
									{catalogo.length === 0 ? <p className={styles.muted}>Ningún permiso coincide con la búsqueda.</p> : null}
								</>
							) : null}

							{pestania === 'usuarios' ? (
								usuarios === null ? (
									<p className={styles.muted}>Cargando…</p>
								) : usuarios.length === 0 ? (
									<p className={styles.muted}>Ningún usuario tiene este rol asignado.</p>
								) : (
									<ul className={styles.list}>
										{usuarios.map((u) => (
											<li key={u.valor}>
												{u.nombre || `Personal #${u.valor}`}
												{u.esPrincipal ? <span className={styles.badge}>Principal</span> : null}
											</li>
										))}
									</ul>
								)
							) : null}

							{pestania === 'historial' ? (
								seleccionado.esSistema ? (
									<p className={styles.muted}>Los roles del sistema no tienen historial de cambios.</p>
								) : historial === null ? (
									<p className={styles.muted}>Cargando…</p>
								) : historial.length === 0 ? (
									<p className={styles.muted}>Sin movimientos registrados.</p>
								) : (
									<ul className={styles.list}>
										{historial.map((h) => (
											<li key={h.id}>
												<strong>{ROTULO_EVENTO[h.accion] ?? h.accion}</strong>{' '}
												<span className={styles.muted}>
													· {h.actorNombre || (h.actor != null ? `Personal #${h.actor}` : 'Sistema')} ·{' '}
													{new Date(h.fecha).toLocaleString('es-AR')}
												</span>
												{resumenEvento(h) ? <div className={styles.muted}>{resumenEvento(h)}</div> : null}
											</li>
										))}
									</ul>
								)
							) : null}
						</>
					)}
				</section>
			</div>

			{sucio ? (
				<div className={styles.saveBar}>
					<span>Tenés cambios sin guardar</span>
					<button type="button" className={styles.btn} disabled={ocupado} onClick={descartar}>
						Descartar
					</button>
					<button
						type="button"
						className={`${styles.btn} ${styles.btnPrimary}`}
						disabled={ocupado || borrador.nombre.trim().length < 3}
						onClick={() => void guardar()}
					>
						{ocupado ? 'Guardando…' : 'Guardar cambios'}
					</button>
				</div>
			) : null}

			{modalNuevo ? (
				<div className={styles.overlay} onClick={() => !ocupado && setModalNuevo(false)}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<h2>{nuevo.origen ? 'Duplicar rol' : 'Nuevo rol'}</h2>
						<label className={styles.field}>
							Nombre
							<input
								className={styles.input}
								autoFocus
								maxLength={50}
								value={nuevo.nombre}
								onChange={(e) => setNuevo((n) => ({ ...n, nombre: e.target.value }))}
							/>
						</label>
						<label className={styles.field}>
							Descripción (opcional)
							<input
								className={styles.input}
								maxLength={200}
								value={nuevo.descripcion}
								onChange={(e) => setNuevo((n) => ({ ...n, descripcion: e.target.value }))}
							/>
						</label>
						<label className={styles.field}>
							Partir de
							<select
								className={styles.select}
								value={nuevo.origen}
								onChange={(e) => setNuevo((n) => ({ ...n, origen: e.target.value }))}
							>
								<option value="">Rol vacío (sin permisos)</option>
								{roles
									.filter((r) => r.nombre.toUpperCase() !== 'SUPER_ADMIN')
									.map((r) => (
										<option key={r.idRol} value={r.idRol}>
											Copia de {r.nombre}
										</option>
									))}
							</select>
						</label>
						<div className={styles.modalActions}>
							<button type="button" className={styles.btn} disabled={ocupado} onClick={() => setModalNuevo(false)}>
								Cancelar
							</button>
							<button
								type="button"
								className={`${styles.btn} ${styles.btnPrimary}`}
								disabled={ocupado || nuevo.nombre.trim().length < 3}
								onClick={() => void crear()}
							>
								{ocupado ? 'Creando…' : 'Crear rol'}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
