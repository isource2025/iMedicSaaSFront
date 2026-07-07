/** Normaliza la respuesta cruda de RENAPER (MSAL) a campos del formulario de paciente. */

export type RenaperPersonaRaw = Record<string, unknown>;

function str(v: unknown): string {
	if (v === undefined || v === null) return '';
	return String(v).trim();
}

export function mapRenaperSexo(persona: RenaperPersonaRaw): string | undefined {
	const s = str(persona.sexo ?? persona.Sexo);
	if (/^[MF]$/i.test(s)) return s.toUpperCase();
	const id = persona.idSexo ?? persona.IdSexo ?? persona.id_sexo;
	if (id != null) {
		const n = Number(id);
		if (n === 1) return 'F';
		if (n === 2) return 'M';
	}
	return undefined;
}

export function mapRenaperApellidoNombre(persona: RenaperPersonaRaw): string {
	const ap = str(persona.apellido ?? persona.Apellido);
	const nom = str(
		persona.nombres ?? persona.Nombres ?? persona.nombre ?? persona.Nombre,
	);
	if (ap && nom) return `${ap}, ${nom}`;
	return ap || nom;
}

export function mapRenaperDomicilio(persona: RenaperPersonaRaw): string {
	const calle = str(persona.calle ?? persona.Calle);
	const numero = str(persona.numero ?? persona.Numero);
	const piso = str(persona.piso ?? persona.Piso);
	const depto = str(persona.departamento ?? persona.Departamento ?? persona.depto);
	let dom = `${calle} ${numero}`.trim();
	if (piso) dom += dom ? ` Piso ${piso}` : `Piso ${piso}`;
	if (depto) dom += dom ? ` Dpto ${depto}` : `Dpto ${depto}`;
	return dom.slice(0, 120);
}

export function mapRenaperCuil(persona: RenaperPersonaRaw): string {
	return str(persona.cuil ?? persona.CUIL ?? persona.cuit ?? persona.CUIT);
}

export function mapRenaperFechaNacimiento(persona: RenaperPersonaRaw): string | undefined {
	const raw = persona.fechaNacimiento ?? persona.FechaNacimiento;
	if (!raw) return undefined;
	const s = String(raw).slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
}

export function mapRenaperCiudad(persona: RenaperPersonaRaw): string {
	return str(persona.ciudad ?? persona.Ciudad ?? persona.localidad ?? persona.Localidad);
}

export function mapRenaperProvincia(persona: RenaperPersonaRaw): string {
	return str(persona.provincia ?? persona.Provincia);
}

export function mapRenaperNacionalidad(persona: RenaperPersonaRaw): string {
	const pais = str(persona.pais ?? persona.Pais);
	return pais || 'Argentina';
}

export interface RenaperPatientFields {
	NumeroDocumento: string;
	ApellidoyNombre: string;
	Domicilio: string;
	FechaNacimiento?: string;
	Sexo?: string;
	CUIT: string;
	Provincia: string;
	Nacionalidad: string;
	ciudadNorm: string;
}

export function mapRenaperToPatientFields(
	persona: RenaperPersonaRaw,
): RenaperPatientFields {
	return {
		NumeroDocumento: str(persona.numeroDocumento ?? persona.NumeroDocumento),
		ApellidoyNombre: mapRenaperApellidoNombre(persona),
		Domicilio: mapRenaperDomicilio(persona),
		FechaNacimiento: mapRenaperFechaNacimiento(persona),
		Sexo: mapRenaperSexo(persona),
		CUIT: mapRenaperCuil(persona),
		Provincia: mapRenaperProvincia(persona),
		Nacionalidad: mapRenaperNacionalidad(persona),
		ciudadNorm: mapRenaperCiudad(persona),
	};
}
