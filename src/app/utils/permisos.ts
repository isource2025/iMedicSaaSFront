/**
 * Matriz de permisos por rol — Fase 2.
 *
 * MODELO JERÁRQUICO: MODULO → SUBMODULO → ACCION
 * Códigos de permiso: 'MODULO.SUBMODULO.ACCION'
 *
 * IMPORTANTE: este archivo es la copia "frontend" de
 * `iMedicWSBack/src/utils/permisos.js`. Mantener ambos en sync.
 *
 * Roles definidos en imRoles (IDs fijos):
 *   1 = ADMIN (administrador del sistema),
 *   2 = MEDICO, 3 = ENFERMERO,
 *   4 = ADMINISTRATIVO (ver todo; gestiona pacientes; sin escritura clínica),
 *   5 = SUPER_ADMIN, 6 = CARGA_HC
 *
 * Un usuario puede tener varios roles: los permisos efectivos son la unión
 * de las plantillas (el login envía la lista en `permisos`).
 */

// ============================================================================
// Acciones canónicas
// ============================================================================
export const ACCIONES = {
	VER: 'VER',
	CREAR: 'CREAR',
	EDITAR: 'EDITAR',
	ELIMINAR: 'ELIMINAR',
	GESTIONAR: 'GESTIONAR',
	APLICAR: 'APLICAR',
	EXPORTAR: 'EXPORTAR',
	IMPRIMIR: 'IMPRIMIR',
} as const;

export type Accion = (typeof ACCIONES)[keyof typeof ACCIONES];

const CRUD: ReadonlyArray<Accion> = [ACCIONES.VER, ACCIONES.CREAR, ACCIONES.EDITAR, ACCIONES.ELIMINAR];

export interface SubmoduloDef {
	id: string;
	label: string;
	path?: string;
	acciones: ReadonlyArray<Accion>;
}

export interface ModuloDef {
	id: string;
	label: string;
	path?: string;
	submodulos: ReadonlyArray<SubmoduloDef>;
}

export type RolNombre = 'ADMIN' | 'MEDICO' | 'ENFERMERO' | 'ADMINISTRATIVO' | 'SUPER_ADMIN' | 'CARGA_HC';

// ============================================================================
// Estructura de módulos (alineada con el sidebar)
// ============================================================================
export const MODULOS: ReadonlyArray<ModuloDef> = [
	{
		id: 'DASHBOARD',
		label: 'Inicio',
		path: '/dashboard',
		submodulos: [
			{ id: 'INICIO', label: 'Inicio', path: '/dashboard', acciones: [ACCIONES.VER] },
		],
	},
	{
		id: 'TURNOS',
		label: 'Turnos',
		submodulos: [
			{ id: 'AGENDA',        label: 'Agenda',            path: '/dashboard/turnos/agenda',        acciones: [...CRUD] },
			{ id: 'ADMIN',         label: 'Gestión de turnos', path: '/dashboard/turnos/admin',         acciones: [...CRUD, ACCIONES.GESTIONAR] },
			{ id: 'EXCEPCIONES',   label: 'Excepciones',       path: '/dashboard/turnos/excepciones',   acciones: [...CRUD] },
			{ id: 'CONFIGURACION', label: 'Configuración',     path: '/dashboard/turnos/configuracion', acciones: [ACCIONES.VER, ACCIONES.EDITAR, ACCIONES.GESTIONAR] },
			{ id: 'TABLA',         label: 'Tabla de Turnos',   path: '/dashboard/turnos/tabla',         acciones: [ACCIONES.VER, ACCIONES.EXPORTAR] },
		],
	},
	{
		id: 'ADMISION',
		label: 'Admisión',
		submodulos: [
			{ id: 'PACIENTES', label: 'Pacientes',           path: '/dashboard/patients',         acciones: [...CRUD] },
			{ id: 'BUSQUEDA',  label: 'Consultar Historia Clínica',   path: '/dashboard/admission/search', acciones: [ACCIONES.VER] },
			{ id: 'NUEVA',     label: 'Nueva Admisión',      path: '/dashboard/admission/new',    acciones: [ACCIONES.CREAR] },
			{ id: 'TABLA',     label: 'Tabla de Admisiones', path: '/dashboard/admission/tables', acciones: [ACCIONES.VER, ACCIONES.EXPORTAR] },
		],
	},
	{
		id: 'INTERNACION',
		label: 'Internación',
		submodulos: [
			{ id: 'CAMAS',     label: 'Gestión de Camas',     path: '/dashboard/beds',           acciones: [...CRUD, ACCIONES.GESTIONAR] },
			{ id: 'TABLA',     label: 'Tabla de Internación', path: '/dashboard/beds/tables',    acciones: [ACCIONES.VER, ACCIONES.EXPORTAR] },

			// Funcionalidades clínicas (sidebar de la cama)
			{ id: 'HISTORIA_CLINICA',     label: 'Historia clínica',           acciones: [...CRUD] },
			{ id: 'INDICACIONES',         label: 'Indicaciones médicas',       acciones: [...CRUD, ACCIONES.APLICAR] },
			{ id: 'EVOLUCIONES',          label: 'Evoluciones médicas',        acciones: [...CRUD] },
			{ id: 'INTERCONSULTAS',       label: 'Interconsultas',             acciones: [...CRUD] },
			{ id: 'EVOLUCION_ENFERMERIA', label: 'Evolución de enfermería',    acciones: [...CRUD] },
			{ id: 'SIGNOS_VITALES',       label: 'Controles / signos vitales', acciones: [...CRUD] },
			{ id: 'MEDICACION',           label: 'Medicación suministrada',    acciones: [...CRUD] },
			{ id: 'DIETA',                label: 'Dietas',                     acciones: [...CRUD] },
			{ id: 'BALANCE_HIDRICO',      label: 'Balance hídrico',            acciones: [...CRUD] },
			{ id: 'INSUMOS',              label: 'Insumos',                    acciones: [...CRUD] },
			{ id: 'ESTUDIOS',             label: 'Pedidos de estudios (complementarios)', acciones: [...CRUD] },
			{ id: 'PROTOCOLOS',           label: 'Protocolos',                 acciones: [...CRUD] },
			{ id: 'PROCEDIMIENTOS',       label: 'Procedimientos',             acciones: [...CRUD] },
			{ id: 'MOVIMIENTOS',          label: 'Movimientos / traslados',    acciones: [ACCIONES.VER, ACCIONES.GESTIONAR] },
			{ id: 'ADJUNTOS',             label: 'Adjuntos',                   acciones: [...CRUD] },
			{ id: 'EPICRISIS',            label: 'Epicrisis',                  acciones: [...CRUD, ACCIONES.IMPRIMIR] },
		],
	},
	{
		id: 'FACTURACION',
		label: 'Facturación',
		submodulos: [
			{ id: 'CONVENIOS',     label: 'Convenios',     path: '/dashboard/billing/convenios',     acciones: [...CRUD] },
			{ id: 'RENDICIONES',   label: 'Rendiciones',   path: '/dashboard/billing/rendiciones',   acciones: [...CRUD, ACCIONES.EXPORTAR] },
			{ id: 'LIQUIDACIONES', label: 'Liquidaciones', path: '/dashboard/billing/liquidaciones', acciones: [...CRUD, ACCIONES.GESTIONAR] },
			{ id: 'PRACTICAS',     label: 'Prácticas',                                                acciones: [...CRUD] },
			{ id: 'TABLA',         label: 'Tabla de Facturación', path: '/dashboard/billing/tables', acciones: [ACCIONES.VER, ACCIONES.EXPORTAR] },
		],
	},
	{
		id: 'ALMACEN',
		label: 'Almacén',
		submodulos: [
			{ id: 'STOCK',       label: 'Stock',                     path: '/dashboard/almacen',                    acciones: [ACCIONES.VER, ACCIONES.GESTIONAR, ACCIONES.EXPORTAR] },
			{ id: 'ARTICULOS',   label: 'Artículos',                 path: '/dashboard/almacen?tab=articulos',       acciones: [...CRUD] },
			{ id: 'PROVEEDORES', label: 'Proveedores',               path: '/dashboard/almacen?tab=proveedores',     acciones: [...CRUD] },
			{ id: 'SOLICITUDES', label: 'Solicitudes de provisión',  path: '/dashboard/almacen?tab=solicitudes',     acciones: [...CRUD, ACCIONES.GESTIONAR, ACCIONES.IMPRIMIR] },
			{ id: 'ORDENES',     label: 'Órdenes de provisión',      path: '/dashboard/almacen?tab=ordenes',         acciones: [...CRUD, ACCIONES.IMPRIMIR] },
			{ id: 'ACTAS',       label: 'Actas de recepción',        path: '/dashboard/almacen?tab=actas',           acciones: [...CRUD, ACCIONES.IMPRIMIR] },
			{ id: 'MOVIMIENTOS', label: 'Historial de movimientos', path: '/dashboard/almacen?tab=movimientos',     acciones: [ACCIONES.VER, ACCIONES.EXPORTAR] },
			{ id: 'CONFIG',     label: 'Configuración',             path: '/dashboard/almacen?tab=config',          acciones: [ACCIONES.VER, ACCIONES.EDITAR] },
		],
	},
	{
		id: 'REPORTES',
		label: 'Reportes',
		submodulos: [
			{ id: 'ESTADISTICAS', label: 'Estadísticas', path: '/dashboard/reports/estadisticas', acciones: [ACCIONES.VER, ACCIONES.EXPORTAR] },
			{ id: 'FACTURACION',  label: 'Facturación',  path: '/dashboard/reports/facturacion',  acciones: [ACCIONES.VER, ACCIONES.EXPORTAR] },
			{ id: 'OCUPACION',    label: 'Ocupación',    path: '/dashboard/reports/ocupacion',    acciones: [ACCIONES.VER, ACCIONES.EXPORTAR] },
		],
	},
	{
		id: 'CONFIGURACION',
		label: 'Configuración',
		submodulos: [
			{ id: 'PERSONAL', label: 'Personal', path: '/dashboard/personal', acciones: [...CRUD, ACCIONES.GESTIONAR] },
		],
	},
	{
		id: 'PLATAFORMA',
		label: 'Plataforma',
		submodulos: [
			{ id: 'PANEL', label: 'Panel', path: '/dashboard/super-admin', acciones: [ACCIONES.VER] },
			{ id: 'EMPRESAS', label: 'Empresas', path: '/dashboard/super-admin/empresas', acciones: [...CRUD, ACCIONES.GESTIONAR] },
			{ id: 'USUARIOS', label: 'Usuarios', path: '/dashboard/super-admin/usuarios', acciones: [ACCIONES.VER, ACCIONES.GESTIONAR] },
			{ id: 'ONBOARDING', label: 'Alta de empresa', path: '/dashboard/super-admin/alta', acciones: [ACCIONES.VER, ACCIONES.GESTIONAR] },
			{ id: 'COBRANZA', label: 'Cobranza', path: '/dashboard/super-admin/cobranza', acciones: [ACCIONES.VER, ACCIONES.GESTIONAR, ACCIONES.EXPORTAR] },
			{ id: 'CONFIG', label: 'Configuración', path: '/dashboard/super-admin/configuracion', acciones: [ACCIONES.VER, ACCIONES.GESTIONAR] },
			{ id: 'SEGURIDAD', label: 'Seguridad', path: '/dashboard/super-admin/seguridad', acciones: [ACCIONES.VER, ACCIONES.GESTIONAR] },
			{ id: 'ANALITICA', label: 'Analítica', path: '/dashboard/super-admin/analitica', acciones: [ACCIONES.VER, ACCIONES.EXPORTAR] },
		],
	},
	{
		id: 'USUARIO',
		label: 'Mi Perfil',
		submodulos: [
			{ id: 'PERFIL',     label: 'Mi Perfil',     path: '/dashboard/profile', acciones: [ACCIONES.VER, ACCIONES.EDITAR] },
			{ id: 'PRODUCCION', label: 'Mi Producción',                              acciones: [ACCIONES.VER, ACCIONES.EXPORTAR] },
		],
	},
] as const;

function _todas(modId: string, subId: string): string[] {
	const mod = MODULOS.find((m) => m.id === modId);
	if (!mod) return [];
	const sub = mod.submodulos.find((s) => s.id === subId);
	if (!sub) return [];
	return sub.acciones.map((a) => `${modId}.${subId}.${a}`);
}

/** Solo VER en todos los submódulos del módulo que lo exponen. */
function _soloVer(modId: string): string[] {
	const mod = MODULOS.find((m) => m.id === modId);
	if (!mod) return [];
	return mod.submodulos
		.filter((s) => s.acciones.includes(ACCIONES.VER))
		.map((s) => `${modId}.${s.id}.${ACCIONES.VER}`);
}

// ============================================================================
// Plantillas por rol
// ============================================================================
export const PLANTILLAS: Record<RolNombre, ReadonlyArray<string>> = {
	ADMIN: MODULOS.filter((m) => m.id !== 'PLATAFORMA').flatMap((m) =>
		m.submodulos.flatMap((s) => s.acciones.map((a) => `${m.id}.${s.id}.${a}`)),
	),

	SUPER_ADMIN: MODULOS.flatMap((m) =>
		m.submodulos.flatMap((s) => s.acciones.map((a) => `${m.id}.${s.id}.${a}`)),
	),

	MEDICO: [
		'DASHBOARD.INICIO.VER',

		// Agenda propia
		'TURNOS.AGENDA.VER',
		'TURNOS.AGENDA.CREAR',
		'TURNOS.AGENDA.EDITAR',
		'TURNOS.AGENDA.ELIMINAR',
		'TURNOS.EXCEPCIONES.VER',
		'TURNOS.EXCEPCIONES.CREAR',
		'TURNOS.EXCEPCIONES.EDITAR',
		'TURNOS.EXCEPCIONES.ELIMINAR',
		'TURNOS.CONFIGURACION.VER',
		'TURNOS.TABLA.VER',

		'ADMISION.PACIENTES.VER',
		'ADMISION.PACIENTES.CREAR',
		'ADMISION.PACIENTES.EDITAR',
		'ADMISION.BUSQUEDA.VER',
		'ADMISION.TABLA.VER',

		'INTERNACION.CAMAS.VER',
		'INTERNACION.CAMAS.GESTIONAR',
		'INTERNACION.TABLA.VER',
		..._todas('INTERNACION', 'HISTORIA_CLINICA'),
		// Médico: crea, edita y elimina indicaciones, pero NO las aplica (eso es enfermería)
		'INTERNACION.INDICACIONES.VER',
		'INTERNACION.INDICACIONES.CREAR',
		'INTERNACION.INDICACIONES.EDITAR',
		'INTERNACION.INDICACIONES.ELIMINAR',
		..._todas('INTERNACION', 'EVOLUCIONES'),
		..._todas('INTERNACION', 'INTERCONSULTAS'),
		..._todas('INTERNACION', 'ESTUDIOS'),
		..._todas('INTERNACION', 'PROTOCOLOS'),
		..._todas('INTERNACION', 'PROCEDIMIENTOS'),
		..._todas('INTERNACION', 'EPICRISIS'),
		'INTERNACION.MOVIMIENTOS.VER',
		'INTERNACION.MOVIMIENTOS.GESTIONAR',
		'INTERNACION.EVOLUCION_ENFERMERIA.VER',
		'INTERNACION.SIGNOS_VITALES.VER',
		'INTERNACION.MEDICACION.VER',
		'INTERNACION.DIETA.VER',
		'INTERNACION.BALANCE_HIDRICO.VER',
		'INTERNACION.INSUMOS.VER',
		'INTERNACION.ADJUNTOS.VER',
		'INTERNACION.ADJUNTOS.CREAR',
		'INTERNACION.ADJUNTOS.EDITAR',
		'INTERNACION.ADJUNTOS.ELIMINAR',

		'FACTURACION.PRACTICAS.VER',
		'FACTURACION.PRACTICAS.CREAR',

		'REPORTES.ESTADISTICAS.VER',
		'REPORTES.OCUPACION.VER',

		'USUARIO.PERFIL.VER',
		'USUARIO.PERFIL.EDITAR',
		'USUARIO.PRODUCCION.VER',
		'USUARIO.PRODUCCION.EXPORTAR',
	],

	ENFERMERO: [
		'DASHBOARD.INICIO.VER',

		'TURNOS.AGENDA.VER',
		'TURNOS.AGENDA.EDITAR',

		'ADMISION.PACIENTES.VER',
		'ADMISION.BUSQUEDA.VER',

		'INTERNACION.CAMAS.VER',
		'INTERNACION.CAMAS.GESTIONAR',
		'INTERNACION.HISTORIA_CLINICA.VER',
		'INTERNACION.INDICACIONES.VER',
		'INTERNACION.INDICACIONES.APLICAR',
		'INTERNACION.EVOLUCIONES.VER',
		'INTERNACION.ESTUDIOS.VER',
		'INTERNACION.PROTOCOLOS.VER',
		'INTERNACION.PROCEDIMIENTOS.VER',
		'INTERNACION.EPICRISIS.VER',
		'INTERNACION.MOVIMIENTOS.VER',
		..._todas('INTERNACION', 'EVOLUCION_ENFERMERIA'),
		..._todas('INTERNACION', 'SIGNOS_VITALES'),
		..._todas('INTERNACION', 'MEDICACION'),
		..._todas('INTERNACION', 'DIETA'),
		..._todas('INTERNACION', 'BALANCE_HIDRICO'),
		..._todas('INTERNACION', 'INSUMOS'),
		'INTERNACION.ADJUNTOS.VER',
		'INTERNACION.ADJUNTOS.CREAR',
		'INTERNACION.ADJUNTOS.EDITAR',
		'INTERNACION.ADJUNTOS.ELIMINAR',

		'REPORTES.OCUPACION.VER',

		'USUARIO.PERFIL.VER',
		'USUARIO.PERFIL.EDITAR',
	],

	/**
	 * ADMINISTRATIVO — ve todo (incl. clínica), gestiona pacientes/admisiones/camas/agenda.
	 * No crea ni edita lo médico ni de enfermería. Distinto de ADMIN.
	 */
	ADMINISTRATIVO: [
		..._soloVer('DASHBOARD'),
		..._soloVer('TURNOS'),
		..._soloVer('ADMISION'),
		..._soloVer('INTERNACION'),
		..._soloVer('FACTURACION'),
		..._soloVer('ALMACEN'),
		..._soloVer('REPORTES'),
		'CONFIGURACION.PERSONAL.VER',

		// Gestión de pacientes / admisión
		..._todas('ADMISION', 'PACIENTES'),
		'ADMISION.NUEVA.CREAR',
		'ADMISION.TABLA.EXPORTAR',

		// Flujo de internación (cama / traslado), no clínica
		'INTERNACION.CAMAS.CREAR',
		'INTERNACION.CAMAS.EDITAR',
		'INTERNACION.CAMAS.ELIMINAR',
		'INTERNACION.CAMAS.GESTIONAR',
		'INTERNACION.MOVIMIENTOS.GESTIONAR',
		'INTERNACION.TABLA.EXPORTAR',

		// Agenda de turnos (citas del paciente)
		'TURNOS.AGENDA.CREAR',
		'TURNOS.AGENDA.EDITAR',
		'TURNOS.AGENDA.ELIMINAR',
		'TURNOS.TABLA.EXPORTAR',

		'USUARIO.PERFIL.VER',
		'USUARIO.PERFIL.EDITAR',
	],

	/** Código interno: CARGA_HC — "Carga de adjuntos". Bandeja de estudios para adjuntar resultados. */
	CARGA_HC: [
		'DASHBOARD.INICIO.VER',

		'ADMISION.PACIENTES.VER',
		'ADMISION.BUSQUEDA.VER',
		'ADMISION.TABLA.VER',

		'INTERNACION.CAMAS.VER',
		'INTERNACION.CAMAS.GESTIONAR',
		'INTERNACION.ESTUDIOS.VER',
		'INTERNACION.ESTUDIOS.CREAR',
		'INTERNACION.ADJUNTOS.VER',
		'INTERNACION.ADJUNTOS.CREAR',
		'INTERNACION.ADJUNTOS.EDITAR',
		'INTERNACION.ADJUNTOS.ELIMINAR',

		'USUARIO.PERFIL.VER',
		'USUARIO.PERFIL.EDITAR',
	],
};

// ============================================================================
// Helpers
// ============================================================================

function nombreRol(rol: { nombre?: string } | string | null | undefined): RolNombre | null {
	if (!rol) return null;
	const n = typeof rol === 'string' ? rol : rol.nombre || '';
	const up = String(n).trim().toUpperCase();
	if (up === 'ADMIN' || up === 'MEDICO' || up === 'ENFERMERO' || up === 'ADMINISTRATIVO' || up === 'SUPER_ADMIN' || up === 'CARGA_HC') {
		return up as RolNombre;
	}
	return null;
}

/** Etiqueta de catálogo (Personal / Super Admin). CARGA_HC se muestra como "Carga de adjuntos". */
export function etiquetaRol(
	rol: { nombre?: string; descripcion?: string } | string | null | undefined,
): string {
	if (!rol) return '';
	const nombre = typeof rol === 'string' ? rol : String(rol.nombre || '');
	const descripcion = typeof rol === 'string' ? '' : String(rol.descripcion || '').trim();
	const esCargaHc = (s: string) => {
		const n = String(s || '')
			.trim()
			.toUpperCase()
			.replace(/\s+/g, '_');
		return n === 'CARGA_HC' || n === 'CARGAHC';
	};
	if (esCargaHc(nombre) || esCargaHc(descripcion) || /^carga\s*hc$/i.test(nombre) || /^carga\s*hc$/i.test(descripcion)) {
		return 'Carga de adjuntos';
	}
	return descripcion || nombre.trim();
}

/**
 * Lista de permisos efectivos del usuario.
 *
 * Une la plantilla del rol principal (siempre al día) con la lista del login
 * (unión multi-rol). Así un ADMINISTRATIVO solo usa la matriz actual, y un
 * usuario multi-rol conserva los extras de los demás roles.
 */
export function permisosDeRol(
	rol: { nombre?: string } | string | null | undefined,
	permisosUsuario?: ReadonlyArray<string> | null,
): ReadonlyArray<string> {
	const n = nombreRol(rol);
	const lista =
		Array.isArray(permisosUsuario) && permisosUsuario.length > 0
			? [...permisosUsuario]
			: [];
	if (n) {
		return Array.from(new Set(PLANTILLAS[n].concat(lista)));
	}
	return lista;
}

/** ¿Tiene el rol/permisos el código indicado? Acepta verificación parcial. */
export function tienePermiso(
	rol: { nombre?: string } | string | null | undefined,
	codigo: string,
	permisosUsuario?: ReadonlyArray<string> | null,
): boolean {
	if (!codigo) return false;
	const lista = permisosDeRol(rol, permisosUsuario);
	const c = String(codigo);
	if (lista.includes(c)) return true;
	const dots = (c.match(/\./g) || []).length;
	if (dots < 2) {
		const prefijo = c + '.';
		return lista.some((p) => p.startsWith(prefijo));
	}
	return false;
}

export function tieneAccesoAModulo(
	rol: { nombre?: string } | string | null | undefined,
	idModulo: string,
	permisosUsuario?: ReadonlyArray<string> | null,
): boolean {
	const prefijo = `${String(idModulo).toUpperCase()}.`;
	return permisosDeRol(rol, permisosUsuario).some((p) => p.startsWith(prefijo));
}

export function tieneAccesoASubmodulo(
	rol: { nombre?: string } | string | null | undefined,
	idModulo: string,
	idSubmodulo: string,
	permisosUsuario?: ReadonlyArray<string> | null,
): boolean {
	const prefijo = `${String(idModulo).toUpperCase()}.${String(idSubmodulo).toUpperCase()}.`;
	return permisosDeRol(rol, permisosUsuario).some((p) => p.startsWith(prefijo));
}

/** Árbol MODULOS filtrado a lo que el rol/permisos pueden ver. */
export function modulosVisibles(
	rol: { nombre?: string } | string | null | undefined,
	permisosUsuario?: ReadonlyArray<string> | null,
): ModuloDef[] {
	const permisos = new Set(permisosDeRol(rol, permisosUsuario));
	const out: ModuloDef[] = [];
	for (const m of MODULOS) {
		const subs = m.submodulos.filter((s) =>
			s.acciones.some((a) => permisos.has(`${m.id}.${s.id}.${a}`)),
		);
		if (subs.length) out.push({ ...m, submodulos: subs });
	}
	return out;
}
