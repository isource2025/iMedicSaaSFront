export type TurneroPlantilla = 'clasica' | 'moderna' | 'alto-contraste';

export interface TurneroColores {
	/** Fondo general de la pantalla */
	fondo: string;
	/** Texto principal */
	texto: string;
	/** Nombre del paciente / llamado principal */
	destacado: string;
	/** Etiquetas, subtítulos, detalles */
	acento: string;
	/** Botones y acentos de marca */
	primario: string;
	/** Deriva tarjetas y bordes desde el fondo (recomendado) */
	autoTarjetas?: boolean;
	/** Tarjetas/contenedores (manual si autoTarjetas = false) */
	superficie?: string;
	/** Bordes (manual si autoTarjetas = false) */
	borde?: string;
}

export interface TurneroAudioConfig {
	sonidoActivo: boolean;
	sonidoUrl: string;
	vozActiva: boolean;
	vozTexto: string;
	vozLang: string;
	vozRate: number;
	pausaEntreLlamadosMs: number;
}

export interface TurneroVideoConfig {
	activo: boolean;
	fuente: 'youtube' | 'vimeo' | 'url';
	url: string;
	posicion: 'izquierda' | 'derecha';
	proporcion: 40 | 50;
	/** Reproduce audio del video (YouTube/Vimeo/archivo) */
	conSonido: boolean;
	/** Baja el volumen del video durante el anuncio de llamado */
	atenuarAlLlamar: boolean;
	/** Volumen relativo durante llamado (0.05 = 5%, muy de fondo) */
	volumenDuranteLlamado: number;
	/** Repetir el video al finalizar */
	loop: boolean;
}

export interface TurneroDisplayOptions {
	tituloInstitucion: boolean;
	maxLlamadosLista: number;
	mostrarHora: boolean;
	mostrarConsultorio: boolean;
	mostrarProfesional: boolean;
	mostrarMedicosHoy: boolean;
	mantenerPantallaEncendida: boolean;
	autoFullscreen: boolean;
	/** Oculta controles y cursor en la TV (ideal para pantalla dedicada). */
	modoKiosk: boolean;
	/** Vacío = todos los sectores */
	sectoresFiltrados: string[];
}

export interface TurneroMedicoHoy {
	matricula: number;
	nombre: string;
	consultorio: string;
	horarioTexto: string;
}

export interface TurneroConfig {
	plantilla: TurneroPlantilla;
	colores: TurneroColores;
	tipografia: {
		familia: string;
		escala: number;
	};
	audio: TurneroAudioConfig;
	video: TurneroVideoConfig;
	display: TurneroDisplayOptions;
}

export interface TurneroLlamado {
	idLlamado: number;
	idTurno: number;
	paciente: string;
	consultorio: string;
	profesional: string;
	sector: string;
	horaTurno: string | null;
	llamadoEn: string | null;
	/** HH:MM ya formateado en America/Argentina/Buenos_Aires */
	llamadoEnHora?: string | null;
}

export interface TurneroPantallaLink {
	idPantalla: number;
	nombre: string;
	displayPath: string;
	publicToken: string;
	sectoresResumen: string;
}

export interface TurneroPantallaResumen {
	idPantalla: number;
	nombre: string;
	publicToken: string;
	sectoresResumen: string;
	activa: boolean;
}

export interface TurneroAdminState {
	idPantalla: number;
	nombre: string;
	publicToken: string;
	config: TurneroConfig;
	activa: boolean;
}

export interface TurneroDisplayState {
	idPantalla: number;
	nombre: string;
	publicToken: string;
	config: TurneroConfig;
	empresa: { nombre: string };
	ultimoLlamado: TurneroLlamado | null;
	llamados: TurneroLlamado[];
	medicosHoy?: TurneroMedicoHoy[];
}

export const PLANTILLAS_TURNERO: { id: TurneroPlantilla; label: string; desc: string }[] = [
	{ id: 'clasica', label: 'Clásica', desc: 'Fondo oscuro, paciente dorado, acentos verde/cian' },
	{ id: 'moderna', label: 'Moderna', desc: 'Cards con gradiente índigo y tipografía limpia' },
	{ id: 'alto-contraste', label: 'Alto contraste', desc: 'Negro y amarillo, máxima legibilidad' },
];

export const DEFAULT_TURNERO_CONFIG: TurneroConfig = {
	plantilla: 'clasica',
	colores: {
		fondo: '#0f172a',
		texto: '#f1f5f9',
		destacado: '#fbbf24',
		acento: '#38bdf8',
		primario: '#10b981',
		autoTarjetas: true,
	},
	tipografia: {
		familia: 'system-ui, Segoe UI, sans-serif',
		escala: 1,
	},
	audio: {
		sonidoActivo: true,
		sonidoUrl: '',
		vozActiva: true,
		vozTexto: 'Turno de {paciente}, consultorio {consultorio}',
		vozLang: 'es-AR',
		vozRate: 0.95,
		pausaEntreLlamadosMs: 1500,
	},
	video: {
		activo: false,
		fuente: 'youtube',
		url: '',
		posicion: 'izquierda',
		proporcion: 40,
		conSonido: true,
		atenuarAlLlamar: true,
		volumenDuranteLlamado: 0.05,
		loop: true,
	},
	display: {
		tituloInstitucion: true,
		maxLlamadosLista: 8,
		mostrarHora: true,
		mostrarConsultorio: true,
		mostrarProfesional: true,
		mostrarMedicosHoy: true,
		mantenerPantallaEncendida: true,
		autoFullscreen: false,
		modoKiosk: false,
		sectoresFiltrados: [],
	},
};

export function sectorVisibleEnPantalla(sector: string, config: TurneroConfig): boolean {
	const filtros = config.display.sectoresFiltrados;
	if (!filtros?.length) return true;
	const s = String(sector || '').trim();
	return filtros.some((f) => String(f || '').trim() === s);
}

export function buildVozTexto(
	plantilla: string,
	llamado: Pick<TurneroLlamado, 'paciente' | 'consultorio' | 'profesional' | 'sector' | 'horaTurno'>,
): string {
	return plantilla
		.replace(/\{paciente\}/gi, llamado.paciente || 'paciente')
		.replace(/\{consultorio\}/gi, llamado.consultorio || 'consultorio')
		.replace(/\{profesional\}/gi, llamado.profesional || 'profesional')
		.replace(/\{sector\}/gi, llamado.sector || '')
		.replace(/\{hora\}/gi, llamado.horaTurno || '');
}
