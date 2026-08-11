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
};
