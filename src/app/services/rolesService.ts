import { apiService } from './axios';

export interface Rol {
	IdRol: number;
	Nombre: string;
	Descripcion: string;
	Nivel: number;
	Activo: boolean;
	EsPrincipal?: boolean;
}

export interface RolesDePersonal {
	roles: Rol[];
	principal: Rol | null;
}

interface ApiOk<T> {
	success: boolean;
	data: T;
	mensaje?: string;
}

// ─── Matriz de permisos ─────────────────────────────────────────────────────

export type RolBase = 'NINGUNO' | 'MEDICO' | 'ENFERMERO' | 'ADMINISTRATIVO' | 'CARGA_HC';

export interface RolMatriz {
	idRol: number;
	nombre: string;
	descripcion: string;
	nivel: number;
	esSistema: boolean;
	editable: boolean;
	rolBase: RolBase | null;
	permisos: string[];
	usuarios: number;
	fechaCreacion?: string | null;
	fechaModificacion?: string | null;
}

export interface AccionCatalogo {
	accion: string;
	codigo: string;
	descripcion: string;
	asignable: boolean;
}

export interface SubmoduloCatalogo {
	id: string;
	label: string;
	path: string | null;
	descripcion: string;
	acciones: AccionCatalogo[];
}

export interface ModuloCatalogo {
	id: string;
	label: string;
	submodulos: SubmoduloCatalogo[];
}

export interface MatrizRoles {
	soportaPersonalizados: boolean;
	esquemaListo: boolean;
	sistema: RolMatriz[];
	personalizados: RolMatriz[];
	catalogo: ModuloCatalogo[];
	permisosActor: string[];
}

export interface DatosRol {
	nombre: string;
	descripcion?: string;
	rolBase?: RolBase;
	permisos?: string[];
}

export interface UsuarioDeRol {
	valor: number;
	nombre: string;
	esPrincipal: boolean;
}

export interface EventoAuditoriaRol {
	id: number;
	accion: string;
	actor: number | null;
	actorNombre: string;
	fecha: string;
	detalle: Record<string, unknown> | null;
}

export const rolesService = {
	/** Lista los roles activos del catálogo. */
	async listar(): Promise<Rol[]> {
		const res = await apiService.get<ApiOk<Rol[]>>('/roles');
		return res.data?.data || [];
	},

	/** Obtiene roles asignados + principal de un personal. */
	async getRolesDePersonal(valorPersonal: number): Promise<RolesDePersonal> {
		const res = await apiService.get<ApiOk<RolesDePersonal | Rol | null>>(
			`/roles/personal/${encodeURIComponent(String(valorPersonal))}`,
		);
		const raw = res.data?.data;
		if (!raw) return { roles: [], principal: null };
		// Compat: respuesta antigua era un solo Rol
		if (Array.isArray((raw as RolesDePersonal).roles) || 'principal' in (raw as object)) {
			const pack = raw as RolesDePersonal;
			return {
				roles: pack.roles || [],
				principal: pack.principal ?? null,
			};
		}
		const solo = raw as Rol;
		return { roles: [{ ...solo, EsPrincipal: true }], principal: solo };
	},

	/** @deprecated Usar getRolesDePersonal */
	async getRolDePersonal(valorPersonal: number): Promise<Rol | null> {
		const pack = await this.getRolesDePersonal(valorPersonal);
		return pack.principal;
	},

	/**
	 * Asigna varios roles. Pasar `idRoles: []` para limpiar.
	 */
	async asignarRolesAPersonal(
		valorPersonal: number,
		idRoles: number[],
		idRolPrincipal: number | null = null,
	): Promise<RolesDePersonal> {
		const res = await apiService.put<ApiOk<RolesDePersonal>>(
			`/roles/personal/${encodeURIComponent(String(valorPersonal))}`,
			{ idRoles, idRolPrincipal },
		);
		return res.data?.data || { roles: [], principal: null };
	},

	/**
	 * Asigna un único rol (compatibilidad). Pasar `null` para limpiar.
	 */
	async asignarRolAPersonal(valorPersonal: number, idRol: number | null): Promise<Rol | null> {
		const pack = await this.asignarRolesAPersonal(
			valorPersonal,
			idRol == null ? [] : [idRol],
			idRol,
		);
		return pack.principal;
	},

	// ─── Matriz de permisos (roles personalizados de la clínica) ───────────

	/** Roles del sistema + personalizados + catálogo de permisos con descripciones. */
	async matriz(): Promise<MatrizRoles> {
		const res = await apiService.get<ApiOk<MatrizRoles>>('/roles/matriz');
		return res.data.data;
	},

	async crearRol(datos: DatosRol): Promise<{ idRol: number; nombre: string }> {
		const res = await apiService.post<ApiOk<{ idRol: number; nombre: string }>>('/roles', datos);
		return res.data.data;
	},

	async duplicarRol(
		idRol: number,
		datos: { nombre?: string; descripcion?: string } = {},
	): Promise<{ idRol: number; nombre: string }> {
		const res = await apiService.post<ApiOk<{ idRol: number; nombre: string }>>(
			`/roles/${idRol}/duplicar`,
			datos,
		);
		return res.data.data;
	},

	async actualizarRol(
		idRol: number,
		datos: Partial<DatosRol>,
	): Promise<{ idRol: number; sinCambios: boolean; agregadosAuto?: string[] }> {
		const res = await apiService.put<
			ApiOk<{ idRol: number; sinCambios: boolean; agregadosAuto?: string[] }>
		>(`/roles/${idRol}`, datos);
		return res.data.data;
	},

	async eliminarRol(idRol: number): Promise<void> {
		await apiService.delete(`/roles/${idRol}`);
	},

	async usuariosDeRol(idRol: number): Promise<UsuarioDeRol[]> {
		const res = await apiService.get<ApiOk<UsuarioDeRol[]>>(`/roles/${idRol}/usuarios`);
		return res.data.data || [];
	},

	async auditoriaDeRol(idRol: number): Promise<EventoAuditoriaRol[]> {
		const res = await apiService.get<ApiOk<EventoAuditoriaRol[]>>(`/roles/${idRol}/auditoria`);
		return res.data.data || [];
	},
};
