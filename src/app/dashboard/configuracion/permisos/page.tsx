'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PersonalPermisosMatriz from '@/app/components/Personal/PersonalPermisosMatriz';
import { usePermiso } from '@/app/hooks/usePermiso';
import { getPersonalList } from '@/app/services/personalService';
import {
	permisosPersonalService,
	type PermisosDePersonal,
} from '@/app/services/permisosPersonalService';
import {
	etiquetaRolCatalogo,
	rolesService,
	type EventoAuditoriaRol,
	type MatrizRoles,
	type ModuloCatalogo,
	type RolBase,
	type RolMatriz,
	type SubmoduloCatalogo,
	type UsuarioDeRol,
} from '@/app/services/rolesService';
import type { Personal } from '@/app/types/personal';
import { mensajeDeError } from '@/app/utils/apiError';
import { etiquetaRol } from '@/app/utils/permisos';
import styles from './permisos.module.css';

function etiquetaRolMatriz(r: Pick<RolMatriz, 'idRol' | 'esSistema' | 'nombre' | 'descripcion'>): string {
	return etiquetaRolCatalogo({
		IdRol: r.idRol,
		EsSistema: r.esSistema,
		Nombre: r.nombre,
		Descripcion: r.descripcion,
	});
}

type Modo = 'roles' | 'personal';
type Pestania = 'permisos' | 'usuarios' | 'historial';

interface Borrador {
	nombre: string;
	descripcion: string;
	rolBase: RolBase;
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
	EDITAR_AJENOS: 'Editar ajenos',
	CERRAR: 'Cerrar',
	MARCAR_VISTO: 'Marcar visto',
	VER_TODOS: 'Ver todos',
	SOLO_PROPIA: 'Solo propia',
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
		rolBase: rol?.rolBase ?? 'NINGUNO',
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
	const puedeEditar = puede('CONFIGURACION.ROLES.EDITAR');
	const puedePersonal =
		puede('CONFIGURACION.PERSONAL.CREAR') ||
		puede('CONFIGURACION.PERSONAL.EDITAR') ||
		puede('CONFIGURACION.PERSONAL.GESTIONAR');

	const [modo, setModo] = useState<Modo>('roles');
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

	const [listaPersonal, setListaPersonal] = useState<Personal[]>([]);
	const [busquedaPersonal, setBusquedaPersonal] = useState('');
	const [personalId, setPersonalId] = useState<number | null>(null);
	const [packPersonal, setPackPersonal] = useState<PermisosDePersonal | null>(null);
	const [marcadosPersonal, setMarcadosPersonal] = useState<Set<string>>(new Set());
	const [cargandoPersonal, setCargandoPersonal] = useState(false);

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
		if (seleccionado.esSistema) {
			return !mismosPermisos(borrador.permisos, seleccionado.permisos);
		}
		return (
			borrador.nombre.trim() !== seleccionado.nombre ||
			borrador.descripcion.trim() !== (seleccionado.descripcion || '') ||
			borrador.rolBase !== (seleccionado.rolBase ?? 'NINGUNO') ||
			!mismosPermisos(borrador.permisos, seleccionado.permisos)
		);
	}, [borrador, seleccionado]);

	const sucioPersonal = useMemo(() => {
		if (!packPersonal) return false;
		return !mismosPermisos(marcadosPersonal, packPersonal.efectivos);
	}, [marcadosPersonal, packPersonal]);

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

	const cargarListaPersonal = useCallback(async (q = '') => {
		try {
			const res = await getPersonalList(1, 80, q);
			setListaPersonal(res.data || []);
		} catch {
			setListaPersonal([]);
		}
	}, []);

	useEffect(() => {
		if (loaded && puedeVer) void cargar();
		else if (loaded) setCargando(false);
	}, [loaded, puedeVer, cargar]);

	useEffect(() => {
		if (!loaded || !puedePersonal || modo !== 'personal') return;
		const t = window.setTimeout(() => void cargarListaPersonal(busquedaPersonal), 250);
		return () => window.clearTimeout(t);
	}, [loaded, puedePersonal, modo, busquedaPersonal, cargarListaPersonal]);

	useEffect(() => {
		setBorrador(borradorDe(seleccionado));
		setUsuarios(null);
		setHistorial(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [seleccionId, data]);

	useEffect(() => {
		if (!seleccionado || modo !== 'roles') return;
		let vivo = true;
		if (pestania === 'usuarios' && usuarios === null) {
			rolesService
				.usuariosDeRol(seleccionado.idRol)
				.then((u) => vivo && setUsuarios(u))
				.catch(() => vivo && setUsuarios([]));
		}
		if (pestania === 'historial' && historial === null) {
			rolesService
				.auditoriaDeRol(seleccionado.idRol)
				.then((h) => vivo && setHistorial(h))
				.catch(() => vivo && setHistorial([]));
		}
		return () => {
			vivo = false;
		};
	}, [pestania, seleccionado, usuarios, historial, modo]);

	useEffect(() => {
		if (modo !== 'personal' || personalId == null || !puedePersonal) {
			setPackPersonal(null);
			setMarcadosPersonal(new Set());
			return;
		}
		let vivo = true;
		setCargandoPersonal(true);
		setError('');
		permisosPersonalService
			.obtener(personalId)
			.then((pack) => {
				if (!vivo) return;
				setPackPersonal(pack);
				setMarcadosPersonal(new Set(pack.efectivos));
			})
			.catch((e) => {
				if (!vivo) return;
				setPackPersonal(null);
				setMarcadosPersonal(new Set());
				setError(mensajeDeError(e, 'No se pudieron cargar los permisos de la persona'));
			})
			.finally(() => {
				if (vivo) setCargandoPersonal(false);
			});
		return () => {
			vivo = false;
		};
	}, [modo, personalId, puedePersonal]);

	useEffect(() => {
		const hay = modo === 'roles' ? sucio : sucioPersonal;
		if (!hay) return;
		const f = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = '';
		};
		window.addEventListener('beforeunload', f);
		return () => window.removeEventListener('beforeunload', f);
	}, [modo, sucio, sucioPersonal]);

	const cambiarModo = (siguiente: Modo) => {
		if (siguiente === modo) return;
		const hay = modo === 'roles' ? sucio : sucioPersonal;
		if (hay && !window.confirm('Hay cambios sin guardar. ¿Descartarlos?')) return;
		setAviso('');
		setError('');
		setModo(siguiente);
	};

	const seleccionar = (id: number) => {
		if (id === seleccionId) return;
		if (sucio && !window.confirm('Hay cambios sin guardar. ¿Descartarlos?')) return;
		setAviso('');
		setSeleccionId(id);
	};

	const seleccionarPersonal = (valor: number) => {
		if (valor === personalId) return;
		if (sucioPersonal && !window.confirm('Hay cambios sin guardar. ¿Descartarlos?')) return;
		setAviso('');
		setError('');
		setPersonalId(valor);
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
				if (info.accion === 'VER') sub.acciones.forEach((a) => permisos.delete(a.codigo));
			} else {
				permisos.add(codigo);
				if (info.accion !== 'VER' && tieneVer && permisosActor.has(tieneVer.codigo)) {
					permisos.add(tieneVer.codigo);
				}
			}
			return { ...b, permisos };
		});
	};

	const otorgables = (sub: SubmoduloCatalogo) =>
		sub.acciones.filter(
			(a) => permisosActor.has(a.codigo) && (a.asignable || !!seleccionado?.esSistema),
		);

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
			const payload = seleccionado.esSistema
				? { permisos: Array.from(borrador.permisos) }
				: {
						nombre: borrador.nombre,
						descripcion: borrador.descripcion,
						rolBase: borrador.rolBase,
						permisos: Array.from(borrador.permisos),
					};
			const r = await rolesService.actualizarRol(seleccionado.idRol, payload);
			await cargar(seleccionado.idRol);
			setAviso(
				r.sinCambios
					? 'No había cambios para guardar.'
					: 'Plantilla guardada. Los usuarios con este rol verán los cambios en su próxima carga (máx. unos minutos).',
			);
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo guardar el rol'));
		} finally {
			setOcupado(false);
		}
	};

	const descartar = () => setBorrador(borradorDe(seleccionado));

	const guardarPersonal = async () => {
		if (personalId == null) return;
		setOcupado(true);
		setError('');
		setAviso('');
		try {
			const r = await permisosPersonalService.guardar(personalId, Array.from(marcadosPersonal));
			setPackPersonal((prev) =>
				prev
					? { ...prev, base: r.base, grants: r.grants, denies: r.denies, efectivos: r.efectivos }
					: prev,
			);
			setMarcadosPersonal(new Set(r.efectivos));
			setAviso('Permisos de la persona guardados.');
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudieron guardar los permisos'));
		} finally {
			setOcupado(false);
		}
	};

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

	const marcados =
		editable && seleccionado?.editable ? borrador.permisos : new Set(seleccionado?.permisos ?? []);

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

	const personaSel = listaPersonal.find((p) => p.Valor === personalId) || null;

	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<h1>Matriz de permisos</h1>
				<p>
					Editá las plantillas de roles del sistema o elegí una persona para asignarle puertas (permisos
					efectivos).
				</p>
			</header>

			{error ? <div className={`${styles.banner} ${styles.bannerError}`}>{error}</div> : null}
			{aviso ? <div className={`${styles.banner} ${styles.bannerOk}`}>{aviso}</div> : null}

			<div className={styles.modeSwitch}>
				<button
					type="button"
					className={`${styles.modeBtn} ${modo === 'roles' ? styles.modeBtnActive : ''}`}
					onClick={() => cambiarModo('roles')}
				>
					Roles
				</button>
				<button
					type="button"
					className={`${styles.modeBtn} ${modo === 'personal' ? styles.modeBtnActive : ''}`}
					disabled={!puedePersonal}
					title={puedePersonal ? '' : 'Necesitás permiso de Personal'}
					onClick={() => puedePersonal && cambiarModo('personal')}
				>
					Personal
				</button>
			</div>

			{modo === 'roles' ? (
				<div className={styles.layout}>
					<aside className={styles.panel}>
						<div className={styles.sideTitle}>Roles del sistema</div>
						{data?.sistema.map((r) => (
							<button
								key={r.idRol}
								type="button"
								className={`${styles.roleItem} ${r.idRol === seleccionId ? styles.roleItemActive : ''}`}
								onClick={() => seleccionar(r.idRol)}
							>
								<span className={styles.roleName}>{etiquetaRolMatriz(r)}</span>
								<span className={styles.roleMeta}>{r.usuarios} usr.</span>
							</button>
						))}

						{data?.personalizados?.length ? (
							<>
								<div className={styles.sideTitle}>Roles personalizados</div>
								{data.personalizados.map((r) => (
									<button
										key={r.idRol}
										type="button"
										className={`${styles.roleItem} ${r.idRol === seleccionId ? styles.roleItemActive : ''}`}
										onClick={() => seleccionar(r.idRol)}
									>
										<span className={styles.roleName}>{etiquetaRolMatriz(r)}</span>
										<span className={styles.roleMeta}>{r.usuarios} usr.</span>
									</button>
								))}
							</>
						) : null}
					</aside>

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
												disabled={seleccionado.esSistema || !editable}
												maxLength={50}
												onChange={(e) => setBorrador((b) => ({ ...b, nombre: e.target.value }))}
											/>
										</label>
										<label className={styles.field}>
											Descripción
											<input
												className={styles.input}
												value={borrador.descripcion}
												disabled={seleccionado.esSistema || !editable}
												maxLength={200}
												onChange={(e) => setBorrador((b) => ({ ...b, descripcion: e.target.value }))}
											/>
										</label>
										{seleccionado.esSistema ? null : (
											<label className={styles.field}>
												Se comporta como
												<select
													className={styles.select}
													value={borrador.rolBase}
													disabled={!editable}
													onChange={(e) =>
														setBorrador((b) => ({ ...b, rolBase: e.target.value as RolBase }))
													}
												>
													<option value="NINGUNO">Ninguno (sólo los permisos marcados)</option>
													<option value="MEDICO">Médico</option>
													<option value="ENFERMERO">Enfermería</option>
													<option value="ADMINISTRATIVO">Administrativo</option>
													<option value="CARGA_HC">Carga de adjunto</option>
												</select>
											</label>
										)}
									</div>
								</div>

								{seleccionado.esSistema ? (
									<div className={`${styles.banner} ${styles.bannerInfo}`}>
										Plantilla del sistema: podés marcar o desmarcar puertas y guardar. Afecta a todas las
										personas con este rol (salvo overrides individuales).
									</div>
								) : !puedeEditar ? (
									<div className={`${styles.banner} ${styles.bannerInfo}`}>
										No tenés permiso para editar roles: podés consultarlos pero no modificarlos.
									</div>
								) : data?.plantillasCongeladas ? (
									<div className={`${styles.banner} ${styles.bannerInfo}`}>
										Plantilla personalizada en sólo lectura. Usá la pestaña Personal para ajustar puertas
										por persona.
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
											{p === 'permisos'
												? 'Permisos'
												: p === 'usuarios'
													? `Usuarios (${seleccionado.usuarios})`
													: 'Historial'}
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
																			const puedeAsignar = a.asignable || !!seleccionado.esSistema;
																			const bloqueado =
																				!editable || (!activo && (!puedeAsignar || sinPermisoPropio));
																			const motivo = !puedeAsignar
																				? 'Este permiso no se puede asignar'
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
																						<span className={styles.accionCodigo}>
																							codigo: {a.codigo.toLowerCase()}
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
										{catalogo.length === 0 ? (
											<p className={styles.muted}>Ningún permiso coincide con la búsqueda.</p>
										) : null}
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
									historial === null ? (
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
													{resumenEvento(h) ? (
														<div className={styles.muted}>{resumenEvento(h)}</div>
													) : null}
												</li>
											))}
										</ul>
									)
								) : null}
							</>
						)}
					</section>
				</div>
			) : (
				<div className={styles.layout}>
					<aside className={styles.panel}>
						<input
							className={styles.input}
							style={{ width: '100%', marginBottom: '0.55rem' }}
							placeholder="Buscar personal…"
							value={busquedaPersonal}
							onChange={(e) => setBusquedaPersonal(e.target.value)}
						/>
						<div className={styles.sideTitle}>Personas</div>
						{listaPersonal.length ? (
							listaPersonal.map((p) => (
								<button
									key={p.Valor}
									type="button"
									className={`${styles.roleItem} ${p.Valor === personalId ? styles.roleItemActive : ''}`}
									onClick={() => seleccionarPersonal(p.Valor)}
								>
									<span className={styles.roleName}>{p.ApellidoNombre || `Personal #${p.Valor}`}</span>
									<span className={styles.roleMeta}>#{p.Valor}</span>
								</button>
							))
						) : (
							<p className={styles.muted}>No hay resultados.</p>
						)}
					</aside>

					<section className={styles.panel}>
						{personalId == null ? (
							<p className={styles.muted}>Elegí una persona para asignarle puertas.</p>
						) : cargandoPersonal ? (
							<p className={styles.muted}>Cargando permisos…</p>
						) : !packPersonal ? (
							<p className={styles.muted}>No se pudieron cargar los permisos.</p>
						) : (
							<>
								<div className={styles.roleHead}>
									<div>
										<strong>{personaSel?.ApellidoNombre || `Personal #${personalId}`}</strong>
										<div className={styles.muted}>
											{packPersonal.roles?.length
												? `Roles: ${packPersonal.roles.map((r) => etiquetaRol(r.nombre)).join(', ')}`
												: packPersonal.rol
													? `Rol: ${etiquetaRol(packPersonal.rol.nombre)}`
													: 'Sin rol asignado'}
										</div>
									</div>
								</div>
								<PersonalPermisosMatriz
									catalogo={packPersonal.catalogo?.length ? packPersonal.catalogo : data?.catalogo || []}
									base={packPersonal.base}
									marcados={marcadosPersonal}
									permisosActor={packPersonal.permisosActor}
									disabled={!puedePersonal || ocupado}
									onChange={setMarcadosPersonal}
								/>
							</>
						)}
					</section>
				</div>
			)}

			{modo === 'roles' && sucio ? (
				<div className={styles.saveBar}>
					<span>Tenés cambios sin guardar</span>
					<button type="button" className={styles.btn} disabled={ocupado} onClick={descartar}>
						Descartar
					</button>
					<button
						type="button"
						className={`${styles.btn} ${styles.btnPrimary}`}
						disabled={ocupado}
						onClick={() => void guardar()}
					>
						{ocupado ? 'Guardando…' : 'Guardar cambios'}
					</button>
				</div>
			) : null}

			{modo === 'personal' && sucioPersonal ? (
				<div className={styles.saveBar}>
					<span>Tenés cambios sin guardar</span>
					<button
						type="button"
						className={styles.btn}
						disabled={ocupado}
						onClick={() => packPersonal && setMarcadosPersonal(new Set(packPersonal.efectivos))}
					>
						Descartar
					</button>
					<button
						type="button"
						className={`${styles.btn} ${styles.btnPrimary}`}
						disabled={ocupado}
						onClick={() => void guardarPersonal()}
					>
						{ocupado ? 'Guardando…' : 'Guardar puertas'}
					</button>
				</div>
			) : null}
		</div>
	);
}
