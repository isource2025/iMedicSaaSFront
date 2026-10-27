import { apiService } from './axios';
import type { ModuloCatalogo } from './rolesService';

interface ApiOk<T> {
	success: boolean;
	data: T;
	mensaje?: string;
}

export interface PermisosDePersonal {
	rol: { id: number; nombre: string; nivel?: number } | null;
	roles: Array<{ id: number; nombre: string; nivel?: number; esPrincipal?: boolean }>;
	base: string[];
	grants: string[];
	denies: string[];
	efectivos: string[];
	catalogo: ModuloCatalogo[];
	permisosActor: string[];
}

export const permisosPersonalService = {
	async obtener(valorPersonal: number): Promise<PermisosDePersonal> {
		const res = await apiService.get<ApiOk<PermisosDePersonal>>(
			`/permisos/personal/${encodeURIComponent(String(valorPersonal))}`,
		);
		return res.data.data;
	},

	async guardar(valorPersonal: number, efectivos: string[]): Promise<{
		base: string[];
		grants: string[];
		denies: string[];
		efectivos: string[];
	}> {
		const res = await apiService.put<
			ApiOk<{ base: string[]; grants: string[]; denies: string[]; efectivos: string[] }>
		>(`/permisos/personal/${encodeURIComponent(String(valorPersonal))}`, { efectivos });
		return res.data.data;
	},

	/** Unión de plantillas de roles (sin overrides), para refrescar la base al marcar roles. */
	async previewBase(idRoles: number[]): Promise<string[]> {
		const res = await apiService.post<ApiOk<{ base: string[] }>>('/permisos/personal/preview', {
			idRoles,
		});
		return res.data.data?.base || [];
	},
};
