// Tipos para el Examen Físico de Historia Clínica de Ingreso

export interface ExamenFisicoPiel {
    coloracion: string;
    humedad: string;
    temperatura: string;
    elasticidad: string;
    unas: string;
    distribucionPilosa: string;
    cicatrices: string;
}

export interface TejidoCelularSubcutaneo {
    distribucion: string;
    cantidad: string;
    nodulos: string;
    enfisema: string;
    edemas: string;
}

export interface SistemaLinfatico {
    linfangitis: string;
    adenomegalias: string;
}

export interface SistemaOsteoArticuloMuscular {
    musculo: string;
    huesos: string;
    columnaVertebral: string;
    indiceTobilloBrazoDerecha: string;
    indiceTobilloBrazoIzquierda: string;
    perimetroDistalProximalMD: string;
    perimetroDistalProximalMI: string;
    articulaciones: string;
}

export interface ExamenCabeza {
    forma: string;
    tamano: string;
    ojos: string;
    pupilas: string;
    conjuntivas: string;
    corneas: string;
    escleroticas: string;
    parpados: string;
    fosasNasales: string;
    boca: string;
    labios: string;
    encias: string;
    fauces: string;
    lengua: string;
    dientes: string;
    glandulasSalivales: string;
    pabellonesAuricularesCAE: string;
}

export interface ExamenCuello {
    conformacion: string;
    laringe: string;
    huecoSupraclavicular: string;
    huecoInfraclavicular: string;
    yugulares: string;
    tiroides: string;
}

export interface SistemaVenoso {
    varices: string;
    flebitis: string;
    trombosis: string;
    circulacionColateral: string;
}

export interface InspeccionMamas {
    tamano: string;
    superficie: string;
    areolas: string;
    pezones: string;
    maniobrapectorales: string;
    pielRetraccion: boolean;
    elevacion: boolean;
    deNaranja: boolean;
    ulceras: boolean;
    observaciones: string;
}

export interface PalpacionMamas {
    limites: string;
    dolorosa: string;
    superficie: string;
    consistencia: string;
    tumor: string;
    fluacionPiel: string;
    derramePorPezon: string;
}

export interface ExamenMamas {
    inspeccion: InspeccionMamas;
    palpacion: PalpacionMamas;
}

export interface AparatoRespiratorio {
    torax: string;
    forma: string;
    elasticidad: string;
    tipoRespiratorio: string;
    expansionDeVertices: string;
    vibracionesVocales: string;
    expansionDeBases: string;
    percusion: string;
    auscultacion: string;
    observaciones: string;
}

export interface AparatoCardiovascular {
    frecuenciaCardiaca: string;
    central: string;
    periferica: string;
    pulsoradialCaracteristicas: string;
    rellenoCapilar: string;
    latidoApexiano: string;
    latidosPalpables: string;
    r1: string;
    r2: string;
    rudosAgregados: string;
    frotes: string;
    soplos: string;
    observaciones: string;
}

export interface Abdomen {
    inspeccion: string;
    palpacion: string;
    superficial: string;
    profunda: string;
    percusion: string;
    higado: string;
    limiteSup: string;
    limiteInf: string;
    altura: string;
    caracteristicas: string;
    auscultacion: string;
    rha: string;
    soplos: string;
    celdaEsplenica: string;
    bazo: string;
    perimetro: string;
    observaciones: string;
}

export interface AparatoUrogenital {
    genitalesExternos: string;
    tactoVaginal: string;
    tactoRectal: string;
    punoPercusion: string;
    puntosUretrales: string;
    observaciones: string;
}

export interface ExamenGinecologico {
    montedevenus: string;
    labiosMayoresMenores: string;
    clitoris: string;
    introito: string;
    vagina: string;
    fondoSacoVaginal: string;
    cervix: string;
    utero: string;
    anexos: string;
    examenAbVaRe: string;
    especuloscopia: string;
    observaciones: string;
}

export interface ExamenObstetrico {
    au: string;
    lcf: string;
    mfa: string;
    du: string;
    tono: string;
    leopold: string;
    tactoVaginal: string;
    bishopP: string;
    bishopR: string;
    bishopE: string;
    bishopL: string;
    bishopD: string;
    membranasOvulares: string;
    maniobraDeTamer: string;
    plano: string;
    pelvimetria: string;
    hidrorrea: string;
    ginecorragia: string;
    loquios: string;
    retraccion: string;
    mamas: string;
    lactancia: string;
    perine: string;
    especuloscopia: string;
    tbm: string;
    diagnostico: string;
}

export interface SistemaNervioso {
    conciencia: string;
    marcha: string;
    tonoMuscular: string;
    fuerzaMuscular: string;
    signosPiramidales: string;
    sensibilidadSuperficial: string;
    signosMeningeos: string;
    paresCraneanos: string;
    taxia: string;
    praxia: string;
}

export interface SignosVitales {
    pa: string;
    fc: string;
    fr: string;
    tax: string;
    glucemia: string;
    impresionGeneral: string;
    facie: string;
    decubito: string;
    marcha: string;
    talla: string;
    pesoActual: string;
    pesoHabitual: string;
    estadoNutricional: string;
}

export interface ExamenOftalmologico {
    fondoDeOjo: string;
    mediosBirefringentes: string;
    cruces: string;
    relacion: string;
    hemorragiaExudados: string;
}

export interface Electrocardiograma {
    ritmo: string;
    frecuencia: string;
    pr: string;
    qt: string;
    ondapEje: string;
    duracion: string;
    amplitud: string;
    conformacion: string;
    qrsEje: string;
    duracionQrs: string;
    ondat: string;
    st: string;
    conclusiones: string;
}

export interface RadiografiaTorax {
    tecnica: string;
    partesBlandas: string;
    partesOseas: string;
    hemidiafragmas: string;
    ict: string;
    senosCostofrenicos: string;
    mediastino: string;
    siluetaCardiovascular: string;
    hilios: string;
    camposPulmonares: string;
    conclusiones: string;
    laboratorio: string;
}

export interface ImpresionDiagnostica {
    impresionDiagnostica: string;
    comentarioDeIngreso: string;
}

export interface PlanDiagnostico {
    a: string;
    b: string;
    c: string;
    d: string;
    e: string;
    f: string;
    g: string;
    h: string;
    i: string;
    j: string;
    k: string;
}

export interface PlanTerapeutico {
    pt1: string;
    pt2: string;
    pt3: string;
    pt4: string;
    pt5: string;
    pt6: string;
    pt7: string;
    pt8: string;
    pt9: string;
    pt10: string;
    pt11: string;
    pt12: string;
    pt13: string;
    pt14: string;
    pt15: string;
}

export interface ExamenesComplementarios {
    detalle: string;
}

export interface AntecedentesPersonales {
    delMedioYLaborales: {
        residenciaActual: string;
        residenciasAnteriores: string;
    };
    habitos: {
        estudios: string;
        ocupacion: string;
        alcoholYToxicos: string;
        alimentacionHabitosAlimenticiosYVenenos: string;
        sexualidad: string;
        deportes: string;
        catarsis: string;
        tabaco: string;
        otrasAdicciones: string;
    };
    patologicos: {
        infectoContagiosas: string;
        vacunas: string;
        cardiovasculares: string;
        gastrointestinales: string;
        respiratorias: string;
        urinarias: string;
        hematologicos: string;
        alergicos: string;
        quirurgicosYTraumatologicos: string;
        dermatologicos: string;
        oftalmologicos: string;
    };
    ginecologicos: {
        quirurgicos: string;
        menarca: string;
        ritmo: string;
        fum: string;
        abortos: string;
        gestas: string;
        partos: string;
    };
    familiares: {
        anticoncepcion: string;
        antecedetesFamiliares: string;
        hijos: string;
    };
}

export interface ExamenFisicoCompleto {
    antecedentesPersonales: AntecedentesPersonales;
    piel: ExamenFisicoPiel;
    tejidoCelularSubcutaneo: TejidoCelularSubcutaneo;
    sistemaLinfatico: SistemaLinfatico;
    sistemaOsteoArticuloMuscular: SistemaOsteoArticuloMuscular;
    cabeza: ExamenCabeza;
    cuello: ExamenCuello;
    sistemaVenoso: SistemaVenoso;
    mamas: ExamenMamas;
    aparatoRespiratorio: AparatoRespiratorio;
    aparatoCardiovascular: AparatoCardiovascular;
    abdomen: Abdomen;
    aparatoUrogenital: AparatoUrogenital;
    examenGinecologico: ExamenGinecologico;
    examenObstetrico: ExamenObstetrico;
    sistemaNervioso: SistemaNervioso;
    signosVitales: SignosVitales;
    examenOftalmologico: ExamenOftalmologico;
    electrocardiograma: Electrocardiograma;
    radiografiaTorax: RadiografiaTorax;
    impresionDiagnostica: ImpresionDiagnostica;
    planDiagnostico: PlanDiagnostico;
    planTerapeutico: PlanTerapeutico;
    examenesComplementarios: ExamenesComplementarios;
}
