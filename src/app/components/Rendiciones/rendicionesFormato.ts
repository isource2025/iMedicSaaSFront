import type { EstadoRendicion, EstadoValorizacion, ImportesRendicion } from '@/app/types/rendiciones';

export const ESTADO_LABEL: Record<EstadoRendicion, string> = {
	abierta: 'Abierta',
	cerrada: 'Cerrada',
};

export const VALORIZACION: Record<EstadoValorizacion, { label: string; ayuda: string }> = {
	coincide: { label: 'Coincide', ayuda: 'El importe es el valor fijo de la regla del convenio.' },
	difiere: {
		label: 'Difiere',
		ayuda: 'El convenio tiene hoy otro valor para esta práctica: se valorizó con un valor anterior o se corrigió a mano.',
	},
	sin_regla: { label: 'Sin regla', ayuda: 'El convenio no tiene una regla para esta práctica y función.' },
	no_cubre: { label: 'No cubre', ayuda: 'La regla del convenio marca la práctica como no cubierta.' },
	calculada: { label: 'Calculada', ayuda: 'La regla es en % o calculada (letras/unidades): el importe sale de una cuenta.' },
	vademecum: { label: 'Vademécum', ayuda: 'Medicamento: el importe sale del precio del vademécum.' },
};

export const COLUMNAS_IMPORTE: { clave: keyof ImportesRendicion; label: string; corta: string }[] = [
	{ clave: 'honorarios', label: 'Honorarios', corta: 'Honorarios' },
	{ clave: 'gastos', label: 'Gastos', corta: 'Gastos' },
	{ clave: 'medicamentos', label: 'Medicamentos', corta: 'Medic.' },
	{ clave: 'otros', label: 'Otros servicios', corta: 'Otros' },
	{ clave: 'total', label: 'Total', corta: 'Total' },
];
