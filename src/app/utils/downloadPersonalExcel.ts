import * as XLSX from 'xlsx';

export type PersonalExportColumn = { id: string; label: string };

/**
 * Genera y descarga un .xlsx a partir de columnas + filas (objetos por id de campo).
 */
export function downloadPersonalExcel(
	columns: PersonalExportColumn[],
	rows: Record<string, unknown>[],
	filename = 'personal.xlsx',
) {
	const header = columns.map((c) => c.label);
	const data = rows.map((row) => columns.map((c) => row[c.id] ?? ''));
	const sheet = XLSX.utils.aoa_to_sheet([header, ...data]);
	const book = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(book, sheet, 'Personal');
	XLSX.writeFile(book, filename);
}
