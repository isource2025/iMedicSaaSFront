import { apiService } from './axios';

export interface Rol {
	IdRol: number;
	Nombre: string;
	Descripcion: string;
	Nivel: number;
	Activo: boolean;
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

	/** Obtiene el rol asignado a un personal (o null si no tiene). */
	async getRolDePersonal(valorPersonal: number): Promise<Rol | null> {
		const res = await apiService.get<ApiOk<Rol | null>>(
			`/roles/personal/${encodeURIComponent(String(valorPersonal))}`,
		);
		return (res.data?.data ?? null) || null;
	},

	/**
	 * Asigna un rol a un personal. Pasar `null` para limpiar el rol.
	 * @returns el rol resultante (o null si quedó sin rol)
	 */
	async asignarRolAPersonal(valorPersonal: number, idRol: number | null): Promise<Rol | null> {
		const res = await apiService.put<ApiOk<Rol | null>>(
			`/roles/personal/${encodeURIComponent(String(valorPersonal))}`,
			{ idRol },
		);
		return (res.data?.data ?? null) || null;
	},
};
