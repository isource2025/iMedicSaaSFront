import { apiService } from './axios';

const getCoberturas = async (): Promise<{ value: string; label: string }[]> => {
	const { data } = await apiService.get<[{ Valor: string; Descripcion: string }]>(
		'/cobertura/list',
	);

	return data.map((item) => ({
		value: item.Valor,
		label: item.Descripcion,
	}));
};

export default {
	getCoberturas,
};
