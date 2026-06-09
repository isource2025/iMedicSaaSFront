import { apiFetch } from '@/app/utils/authFetch';
import {
    Evolucion,
    EvolucionResponse,
    EvolucionesResponse,
    NuevaEvolucionPayload,
} from "../types/evoluciones";

export const evolucionesService = {
    /**
     * Obtener evoluciones por visita y fecha
     */
    getEvolucionesByVisitaAndDate: async (
        idVisita: number,
        fecha: string
    ): Promise<Evolucion[]> => {
        try {
            const res = await apiFetch(
                `/evoluciones/${idVisita}/byDate?date=${fecha}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!res.ok) {
                if (res.status === 404) return [];
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const json: EvolucionesResponse = await res.json();
            if (!json.success) {
                throw new Error(
                    json.mensaje || "Error al obtener evoluciones"
                );
            }
            return json.data ?? [];
        } catch (error) {
            console.error("Error fetching evoluciones:", error);
            return [];
        }
    },

    /**
     * Crear nueva evolución
     */
    postNuevaEvolucion: async (
        data: NuevaEvolucionPayload
    ): Promise<Evolucion> => {
        const res = await apiFetch('/evoluciones', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(
                errorData.mensaje || `HTTP error! status: ${res.status}`
            );
        }

        const json: EvolucionResponse = await res.json();
        if (!json.success) {
            throw new Error(json.mensaje || "Error al crear evolución");
        }
        return json.data;
    },

    /**
     * Obtener evolución por ID
     */
    getEvolucionById: async (id: number): Promise<Evolucion | null> => {
        try {
            const res = await apiFetch(`/evoluciones/${id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                if (res.status === 404) return null;
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const json: EvolucionResponse = await res.json();
            if (!json.success) {
                throw new Error(
                    json.mensaje || "Error al obtener evolución"
                );
            }
            return json.data ?? null;
        } catch (error) {
            console.error("Error fetching evolución by ID:", error);
            return null;
        }
    },

    /**
     * Eliminar evolución
     */
    deleteEvolucion: async (id: number): Promise<boolean> => {
        try {
            const res = await apiFetch(`/evoluciones/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const json = await res.json();
            return json.success ?? false;
        } catch (error) {
            console.error("Error deleting evolución:", error);
            throw error;
        }
    },

    /**
     * Actualizar evolución
     */
    updateEvolucion: async (
        id: number,
        data: Partial<NuevaEvolucionPayload>
    ): Promise<boolean> => {
        try {
            const res = await apiFetch(`/evoluciones/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(
                    errorData.mensaje || `HTTP error! status: ${res.status}`
                );
            }

            const json = await res.json();
            return json.success ?? false;
        } catch (error) {
            console.error("Error updating evolución:", error);
            throw error;
        }
    },
};
