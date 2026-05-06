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
 *   1 = ADMIN, 2 = MEDICO, 3 = ENFERMERO, 4 = ADMINISTRATIVO
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

export type RolNombre = 'ADMIN' | 'MEDICO' | 'ENFERMERO' | 'ADMINISTRATIVO';

// ============================================================================
// Estructura de módulos (alineada con el sidebar)
// ============================================================================
export const MODULOS: ReadonlyArray<ModuloDef> = [
	{
		id: 'DASHBOARD',
		label: 'Dashboard',
		path: '/dashboard',
		submodulos: [
			{ id: 'INICIO', label: 'Inicio', path: '/dashboard', acciones: [ACCIONES.VER] },
		],
	},
	{
		id: 'TURNOS',
		label: 'Turnos',
		submodulos: [
			{ id: 'AGENDA',        label: 'Agenda',          path: '/dashboard/turnos/agenda',        acciones: [...CRUD] },
			{ id: 'ADMIN',         label: 'Admin de Turnos', path: '/dashboard/turnos/admin',         acciones: [...CRUD, ACCIONES.GESTIONAR] },
			{ id: 'EXCEPCIONES',   label: 'Excepciones',     path: '/dashboard/turnos/excepciones',   acciones: [...CRUD] },
			{ id: 'CONFIGURACION', label: 'Configuración',   path: '/dashboard/turnos/configuracion', acciones: [ACCIONES.VER, ACCIONES.EDITAR] },
			{ id: 'TABLA',         label: 'Tabla de Turnos', path: '/dashboard/turnos/tabla',         acciones: [ACCIONES.VER, ACCIONES.EXPORTAR] },
		],
	},
	{
		id: 'ADMISION',
		label: 'Admisión',
		submodulos: [
			{ id: 'PACIENTES', label: 'Pacientes',           path: '/dashboard/patients',         acciones: [...CRUD] },
			{ id: 'BUSQUEDA',  label: 'Búsqueda Integral',   path: '/dashboard/admission/search', acciones: [ACCIONES.VER] },
			{ id: 'NUEVA',     label: 'Nueva Admisión',      path: '/dashboard/admission/new',    acciones: [ACCIONES.CREAR] },
			{ id: 'VIGENTES',  label: 'Admisiones Vigentes', path: '/dashboard/admission/current',acciones: [...CRUD, ACCIONES.GESTIONAR] },
			{ id: 'TABLA',     label: 'Tabla de Admisiones', path: '/dashboard/admission/tables', acciones: [ACCIONES.VER, ACCIONES.EXPORTAR] },
		],
	},
	{
		id: 'INTERNACION',
		label: 'Internación',
		submodulos: [
			{ id: 'CAMAS',     label: 'Gestión de Camas',     path: '/dashboard/beds',           acciones: [...CRUD, ACCIONES.GESTIONAR] },
			{ id: 'OCUPACION', label: 'Ocupación de Camas',   path: '/dashboard/beds/occupation',acciones: [ACCIONES.VER] },
			{ id: 'TABLA',     label: 'Tabla de Internación', path: '/dashboard/beds/tables',    acciones: [ACCIONES.VER, ACCIONES.EXPORTAR] },

			// Funcionalidades clínicas (sidebar de la cama)
			{ id: 'HISTORIA_CLINICA',     label: 'Historia clínica',           acciones: [...CRUD] },
			{ id: 'INDICACIONES',         label: 'Indicaciones médicas',       acciones: [...CRUD, ACCIONES.APLICAR] },
			{ id: 'EVOLUCIONES',          label: 'Evoluciones médicas',        acciones: [...CRUD] },
			{ id: 'EVOLUCION_ENFERMERIA', label: 'Evolución de enfermería',    acciones: [...CRUD] },
			{ id: 'SIGNOS_VITALES',       label: 'Controles / signos vitales', acciones: [...CRUD] },
			{ id: 'MEDICACION',           label: 'Medicación suministrada',    acciones: [...CRUD] },
			{ id: 'DIETA',                label: 'Dietas',                     acciones: [...CRUD] },
			{ id: 'BALANCE_HIDRICO',      label: 'Balance hídrico',            acciones: [...CRUD] },
			{ id: 'INSUMOS',              label: 'Insumos',                    acciones: [...CRUD] },
			{ id: 'ESTUDIOS',             label: 'Estudios / laboratorios',    acciones: [...CRUD] },
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
			{ id: 'GENERAL',  label: 'General',  path: '/dashboard/settings/general',  acciones: [ACCIONES.VER, ACCIONES.EDITAR] },
			{ id: 'USUARIOS', label: 'Usuarios', path: '/dashboard/settings/usuarios', acciones: [...CRUD] },
			{ id: 'PERMISOS', label: 'Permisos', path: '/dashboard/settings/permisos', acciones: [ACCIONES.VER, ACCIONES.GESTIONAR] },
			{ id: 'SECTORES', label: 'Sectores', path: '/dashboard/settings/sectores', acciones: [...CRUD] },
			{ id: 'PERSONAL', label: 'Personal', path: '/dashboard/personal',         acciones: [...CRUD, ACCIONES.GESTIONAR] },
		],
	},
	{
		id: 'USUARIO',
		label: 'Usuario',
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

// ============================================================================
// Plantillas por rol
// ============================================================================
export const PLANTILLAS: Record<RolNombre, ReadonlyArray<string>> = {
	ADMIN: MODULOS.flatMap((m) =>
		m.submodulos.flatMap((s) => s.acciones.map((a) => `${m.id}.${s.id}.${a}`)),
	),

	MEDICO: [
		'DASHBOARD.INICIO.VER',

		'TURNOS.AGENDA.VER',
		'TURNOS.AGENDA.CREAR',
		'TURNOS.AGENDA.EDITAR',
		'TURNOS.TABLA.VER',

		'ADMISION.PACIENTES.VER',
		'ADMISION.PACIENTES.CREAR',
		'ADMISION.PACIENTES.EDITAR',
		'ADMISION.BUSQUEDA.VER',
		'ADMISION.VIGENTES.VER',
		'ADMISION.VIGENTES.GESTIONAR',
		'ADMISION.TABLA.VER',

		'INTERNACION.CAMAS.VER',
		'INTERNACION.CAMAS.GESTIONAR',
		'INTERNACION.OCUPACION.VER',
		'INTERNACION.TABLA.VER',
		..._todas('INTERNACION', 'HISTORIA_CLINICA'),
		// Médico: crea, edita y elimina indicaciones, pero NO las aplica (eso es enfermería)
		'INTERNACION.INDICACIONES.VER',
		'INTERNACION.INDICACIONES.CREAR',
		'INTERNACION.INDICACIONES.EDITAR',
		'INTERNACION.INDICACIONES.ELIMINAR',
		..._todas('INTERNACION', 'EVOLUCIONES'),
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

		'ADMISION.PACIENTES.VER',
		'ADMISION.BUSQUEDA.VER',
		'ADMISION.VIGENTES.VER',

		'INTERNACION.CAMAS.VER',
		'INTERNACION.CAMAS.GESTIONAR',
		'INTERNACION.OCUPACION.VER',
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

		'REPORTES.OCUPACION.VER',

		'USUARIO.PERFIL.VER',
		'USUARIO.PERFIL.EDITAR',
	],

	ADMINISTRATIVO: [
		'DASHBOARD.INICIO.VER',

		'TURNOS.AGENDA.VER',
		'TURNOS.AGENDA.CREAR',
		'TURNOS.AGENDA.EDITAR',
		'TURNOS.TABLA.VER',

		'ADMISION.PACIENTES.VER',
		'ADMISION.PACIENTES.CREAR',
		'ADMISION.PACIENTES.EDITAR',
		'ADMISION.BUSQUEDA.VER',
		'ADMISION.NUEVA.CREAR',
		'ADMISION.VIGENTES.VER',
		'ADMISION.VIGENTES.GESTIONAR',
		'ADMISION.TABLA.VER',
		'ADMISION.TABLA.EXPORTAR',

		'INTERNACION.CAMAS.VER',
		'INTERNACION.OCUPACION.VER',
		'INTERNACION.TABLA.VER',
		'INTERNACION.MOVIMIENTOS.VER',

		'FACTURACION.CONVENIOS.VER',
		'FACTURACION.RENDICIONES.VER',
		'FACTURACION.RENDICIONES.CREAR',
		'FACTURACION.RENDICIONES.EDITAR',
		'FACTURACION.RENDICIONES.EXPORTAR',
		'FACTURACION.LIQUIDACIONES.VER',
		'FACTURACION.LIQUIDACIONES.GESTIONAR',
		'FACTURACION.PRACTICAS.VER',
		'FACTURACION.PRACTICAS.CREAR',
		'FACTURACION.PRACTICAS.EDITAR',
		'FACTURACION.TABLA.VER',
		'FACTURACION.TABLA.EXPORTAR',

		'REPORTES.FACTURACION.VER',
		'REPORTES.OCUPACION.VER',

		'CONFIGURACION.PERSONAL.VER',

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
	if (up === 'ADMIN' || up === 'MEDICO' || up === 'ENFERMERO' || up === 'ADMINISTRATIVO') {
		return up;
	}
	return null;
}

/**
 * Lista de permisos efectivos del usuario.
 *
 * Si `permisosUsuario` viene definido (típicamente cargado del backend tras el
 * login), se usa esa lista. Si no, se cae a la plantilla hardcodeada del rol.
 */
export function permisosDeRol(
	rol: { nombre?: string } | string | null | undefined,
	permisosUsuario?: ReadonlyArray<string> | null,
): ReadonlyArray<string> {
	if (permisosUsuario && permisosUsuario.length) return permisosUsuario;
	const n = nombreRol(rol);
	if (!n) return [];
	return PLANTILLAS[n];
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
