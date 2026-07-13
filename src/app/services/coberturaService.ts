import { apiService } from './axios';

export type CoberturaOption = {
	value: string;
	label: string;
	nroAfiliadoDocumento?: boolean;
	apiValidacion?: string | null;
};

export type AfiliadoMatch = {
	valor: number | string;
	razonSocial: string;
	provider: string;
	activo: boolean;
	nAfiliado: string;
	nroAfiliadoEsDocumento?: boolean;
};

export type ValidarAfiliadoResponse = {
	documento: string | null;
	matches: AfiliadoMatch[];
	primary: AfiliadoMatch | null;
	message?: string;
};

const flagOn = (v: unknown) => {
	const s = String(v ?? '')
		.trim()
		.toUpperCase();
	return s === '1' || s === 'S' || s === 'Y' || s === 'T' || s === 'SI' || s === 'TRUE';
};

const getCoberturas = async (): Promise<CoberturaOption[]> => {
	const { data } = await apiService.get<
		{
			Valor: string | number;
			Descripcion: string;
			NroAfiliadoDocumento?: string | number | null;
			APIValidacionPaciente?: string | null;
		}[]
	>('/cobertura/list');

	return (data || []).map((item) => ({
		value: String(item.Valor),
		label: item.Descripcion,
		nroAfiliadoDocumento: flagOn(item.NroAfiliadoDocumento),
		apiValidacion: item.APIValidacionPaciente
			? String(item.APIValidacionPaciente).trim()
			: null,
	}));
};

const validarAfiliadoPorDocumento = async (
	documento: string | number,
): Promise<ValidarAfiliadoResponse> => {
	const doc = String(documento || '').replace(/\D/g, '');
	if (!doc) {
		return { documento: null, matches: [], primary: null, message: 'Documento inválido' };
	}
	const { data } = await apiService.get<ValidarAfiliadoResponse>(
		`/cobertura/validar-afiliado/${doc}`,
	);
	return data;
};

export default {
	getCoberturas,
	validarAfiliadoPorDocumento,
};
