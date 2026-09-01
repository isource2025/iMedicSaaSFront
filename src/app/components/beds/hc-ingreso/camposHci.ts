/**
 * Traducción de las columnas de dbo.imHCI a algo legible.
 *
 * Lo usan la vista de detalle de la HC y el historial de auditoría, que
 * muestran los mismos campos y tienen que nombrarlos igual.
 */

/** Prefijo de columna → sección del examen físico. */
export const SECCIONES_CONFIG: Record<string, string> = {
    'SV': 'Signos Vitales',
    'PF': 'Piel y Faneras',
    'TCS': 'Tejido Celular Subcutáneo',
    'SL': 'Sistema Linfático',
    'SOAM': 'Sistema Osteoarticulomuscular',
    'C': 'Cabeza',
    'CU': 'Cuello',
    'M': 'Mamas',
    'MI': 'Mamas (inspección)',
    'MP': 'Mamas (palpación)',
    'AR': 'Aparato Respiratorio',
    'AC': 'Aparato Cardiovascular',
    'ACV': 'Aparato Cardiovascular',
    'A': 'Abdomen',
    'AD': 'Abdomen',
    'AUG': 'Aparato Urogenital',
    'AIG': 'Aparato Urogenital',
    'EG': 'Examen Ginecológico',
    'SN': 'Sistema Nervioso',
    'EN': 'Sistema Nervioso',
    'EO': 'Examen Oftalmológico',
    'EC': 'Electrocardiograma',
    'RDT': 'Radiografía de Tórax',
    'PD': 'Plan Diagnóstico',
    'PT': 'Plan Terapéutico',
    'ID': 'Impresión Diagnóstica',
};

const ABREVIATURAS: Record<string, string> = {
    'TEXTO': 'Observaciones',
    'PR': 'Pulso Radial',
    'QT': 'QT',
    'QRS': 'QRS',
    'OndaP': 'Onda P',
    'OndaT': 'Onda T',
    'ST': 'ST',
    'ICT': 'Índice Cardiotorácico',
    'Duracion': 'Duración',
    'Amplitud': 'Amplitud',
    'Conformacion': 'Conformación',
    'Ritmo': 'Ritmo',
    'Frecuencia': 'Frecuencia',
    'Conclusiones': 'Conclusiones',
    'Tecnica': 'Técnica',
    'PartesBlandas': 'Partes Blandas',
    'PartesOseas': 'Partes Óseas',
    'Hemidiafragmas': 'Hemidiafragmas',
    'SenosCostoFrenicos': 'Senos Costofrenicos',
    'Mediastino': 'Mediastino',
    'SiluetaCardiovascular': 'Silueta Cardiovascular',
    'CamposPulmonares': 'Campos Pulmonares',
    'Hilios': 'Hilios',
};

/** Nombre legible de una columna, sin el prefijo de sección. */
export const getNombreCampo = (key: string): string => {
    const sinPrefijo = key.replace(/^[A-Z]+_/, '');

    if (ABREVIATURAS[sinPrefijo]) {
        return ABREVIATURAS[sinPrefijo];
    }

    return sinPrefijo
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
};

/** Sección a la que pertenece una columna, por su prefijo. */
export const getNombreSeccion = (key: string): string => {
    const match = key.match(/^([A-Z]+)_/);
    if (!match) return 'Datos generales';
    return SECCIONES_CONFIG[match[1]] || match[1];
};
