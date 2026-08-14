'use client';

import { useMemo, useState } from 'react';
import type {
	SyncCambioUsuario,
	SyncFisicoInforme,
	SyncRolTipo,
} from '@/app/services/personalService';
import styles from './SyncFisicoInforme.module.css';

type Props = {
	informe: SyncFisicoInforme;
	onClose: () => void;
};

function PermisosArbol({ rol }: { rol: SyncRolTipo }) {
	return (
		<div className={styles.permisosBox}>
			<p className={styles.permisosLead}>
				<strong>{rol.permisos}</strong> permisos en la plantilla {rol.etiqueta}
			</p>
			{rol.modulos.map((m) => (
				<details key={m.modulo} className={styles.nested}>
					<summary>
						{m.modulo}
						<span className={styles.badge}>{m.items.length}</span>
					</summary>
					<ul className={styles.subList}>
						{m.items.map((it) => (
							<li key={`${m.modulo}-${it.nombre}`}>
								<span>{it.nombre}</span>
								<em>{it.acciones.join(', ')}</em>
							</li>
						))}
					</ul>
				</details>
			))}
		</div>
	);
}

function CambioBlock({
	cambio,
	rolesPorTipo,
}: {
	cambio: SyncCambioUsuario;
	rolesPorTipo: SyncRolTipo[];
}) {
	const rol = cambio.idRol != null ? rolesPorTipo.find((r) => r.idRol === cambio.idRol) : null;
	return (
		<div className={`${styles.cambio} ${cambio.accion === 'error' ? styles.cambioError : ''}`}>
			<p className={styles.cambioTitulo}>{cambio.titulo}</p>
			{cambio.usuarioRed ? (
				<p className={styles.metaLine}>Usuario de red: {cambio.usuarioRed}</p>
			) : null}
			{cambio.error ? <p className={styles.errorLine}>{cambio.error}</p> : null}
			{cambio.campos && cambio.campos.length > 0 ? (
				<table className={styles.diffTable}>
					<thead>
						<tr>
							<th>Campo</th>
							<th>Antes</th>
							<th>Ahora</th>
						</tr>
					</thead>
					<tbody>
						{cambio.campos.map((c) => (
							<tr key={c.campo}>
								<td>{c.campo}</td>
								<td>{c.de}</td>
								<td>{c.a}</td>
							</tr>
						))}
					</tbody>
				</table>
			) : null}
			{cambio.tipo === 'ficha' && cambio.accion === 'alta' && !cambio.campos?.length ? (
				<p className={styles.metaLine}>Alta completa desde la base física.</p>
			) : null}
			{cambio.tipo === 'cuenta' && cambio.accion === 'alta' && !cambio.campos?.length ? (
				<p className={styles.metaLine}>Cuenta copiada desde la base física.</p>
			) : null}
			{cambio.tipo === 'cuenta' &&
			cambio.accion === 'actualizacion' &&
			!cambio.campos?.length ? (
				<p className={styles.metaLine}>
					Cambió la clave u otros datos sensibles. El hash SaaS se reinició.
				</p>
			) : null}
			{(cambio.agregados?.length || cambio.quitados?.length) ? (
				<div className={styles.sectorDiff}>
					{cambio.agregados && cambio.agregados.length > 0 ? (
						<p>
							<span className={styles.tagAdd}>+</span> {cambio.agregados.join(', ')}
						</p>
					) : null}
					{cambio.quitados && cambio.quitados.length > 0 ? (
						<p>
							<span className={styles.tagDel}>−</span> {cambio.quitados.join(', ')}
						</p>
					) : null}
				</div>
			) : null}
			{rol ? <PermisosArbol rol={rol} /> : null}
		</div>
	);
}

export default function SyncFisicoInforme({ informe, onClose }: Props) {
	const rolesPorTipo = informe.roles?.porTipo || [];
	const usuarios = useMemo(() => informe.usuarios || [], [informe.usuarios]);
	const [q, setQ] = useState('');
	const [abiertos, setAbiertos] = useState<Set<number>>(() => {
		const next = new Set<number>();
		usuarios.forEach((u) => next.add(u.valor));
		return next;
	});

	const filtrados = useMemo(() => {
		const term = q.trim().toLowerCase();
		if (!term) return usuarios;
		return usuarios.filter(
			(u) =>
				u.nombre.toLowerCase().includes(term) ||
				String(u.valor).includes(term) ||
				u.cambios.some((c) => c.titulo.toLowerCase().includes(term)),
		);
	}, [usuarios, q]);

	const toggle = (valor: number) => {
		setAbiertos((prev) => {
			const next = new Set<number>();
			prev.forEach((v) => next.add(v));
			if (next.has(valor)) next.delete(valor);
			else next.add(valor);
			return next;
		});
	};

	const expandirTodos = () => {
		const next = new Set<number>();
		filtrados.forEach((u) => next.add(u.valor));
		setAbiertos(next);
	};
	const colapsarTodos = () => setAbiertos(new Set());

	const rolesInfo = informe.roles;

	return (
		<div className={styles.root}>
			<p className={styles.lead}>
				{informe.mensaje ||
					(informe.sinCambios
						? 'La nube ya estaba al día. No hubo cambios respecto a la base física.'
						: 'Se aplicaron cambios desde la base física.')}
			</p>

			{informe.items.length > 0 ? (
				<ul className={styles.chips}>
					{informe.items.map((item, idx) => (
						<li key={`${item.texto}-${idx}`} className={item.error ? styles.chipError : styles.chip}>
							<strong>{item.cantidad}</strong> {item.texto}
							{item.extra ? <span> · {item.extra}</span> : null}
						</li>
					))}
				</ul>
			) : null}

			<details className={styles.section} open={!!rolesPorTipo.length}>
				<summary>
					Roles y permisos
					<span className={styles.badge}>{rolesInfo?.asignados || 0}</span>
				</summary>
				<div className={styles.sectionBody}>
					{rolesPorTipo.length === 0 ? (
						<p className={styles.note}>
							No se asignaron roles nuevos en esta corrida.
							{rolesInfo?.yaTenia
								? ` ${rolesInfo.yaTenia} personas ya tenían rol en la nube.`
								: ''}
							{rolesInfo?.sinRol
								? ` ${rolesInfo.sinRol} quedaron sin rol inferible desde el físico.`
								: ''}
						</p>
					) : (
						rolesPorTipo.map((rol) => (
							<details key={rol.idRol} className={styles.nested} open>
								<summary>
									{rol.usuarios} × {rol.etiqueta}
									<span className={styles.badge}>{rol.permisos} permisos</span>
								</summary>
								<PermisosArbol rol={rol} />
							</details>
						))
					)}
				</div>
			</details>

			{informe.catalogoSectores && informe.catalogoSectores.length > 0 ? (
				<details className={styles.section}>
					<summary>
						Catálogo de sectores
						<span className={styles.badge}>{informe.catalogoSectores.length}</span>
					</summary>
					<ul className={styles.plainList}>
						{informe.catalogoSectores.map((s) => (
							<li key={s.valor}>
								<strong>{s.descripcion}</strong>{' '}
								<span>
									({s.accion === 'alta' ? 'nuevo' : `antes: ${s.de || '—'}`})
								</span>
							</li>
						))}
					</ul>
				</details>
			) : null}

			<div className={styles.section} data-open="true">
				<div className={styles.sectionHead}>
					Usuarios actualizados
					<span className={styles.badge}>{usuarios.length}</span>
				</div>
				<div className={styles.sectionBody}>
					{usuarios.length === 0 ? (
						<p className={styles.note}>
							{informe.sinCambios || !informe.items.length
								? 'Ningún usuario cambió en esta corrida.'
								: 'Hay cambios en el resumen, pero no llegó el listado de personas. El backend tiene que estar desplegado con el informe detallado.'}
						</p>
					) : (
						<>
							<div className={styles.toolbar}>
								<input
									className={styles.search}
									type='search'
									placeholder='Buscar por nombre, ID o tipo de cambio…'
									value={q}
									onChange={(e) => setQ(e.target.value)}
								/>
								<div className={styles.toolbarBtns}>
									<button type='button' onClick={expandirTodos}>
										Abrir todos
									</button>
									<button type='button' onClick={colapsarTodos}>
										Cerrar todos
									</button>
								</div>
							</div>
							{filtrados.length === 0 ? (
								<p className={styles.note}>Ningún usuario coincide con la búsqueda.</p>
							) : (
								<ul className={styles.userList}>
									{filtrados.map((u) => {
										const open = abiertos.has(u.valor);
										return (
											<li key={u.valor}>
												<button
													type='button'
													className={styles.userHead}
													aria-expanded={open}
													onClick={() => toggle(u.valor)}
												>
													<span className={styles.chevron} data-open={open}>
														▸
													</span>
													<span className={styles.userName}>{u.nombre}</span>
													<span className={styles.userId}>ID {u.valor}</span>
													<span className={styles.userCount}>
														{u.cambios.length}{' '}
														{u.cambios.length === 1 ? 'cambio' : 'cambios'}
													</span>
												</button>
												{open ? (
													<div className={styles.userBody}>
														{u.cambios.map((c, i) => (
															<CambioBlock
																key={`${u.valor}-${c.tipo}-${i}`}
																cambio={c}
																rolesPorTipo={rolesPorTipo}
															/>
														))}
													</div>
												) : null}
											</li>
										);
									})}
								</ul>
							)}
						</>
					)}
				</div>
			</div>

			<button type='button' className={styles.ok} onClick={onClose}>
				Aceptar
			</button>
		</div>
	);
}
