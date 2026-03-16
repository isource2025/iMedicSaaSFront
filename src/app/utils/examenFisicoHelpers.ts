import { ExamenFisicoCompleto } from "@/app/types/examenFisico";

/**
 * Mapea datos de BD (imHCI) al estado del formulario
 */
export const mapearHCIaExamenFisico = (record: any): ExamenFisicoCompleto => {
    const empty = getEmptyExamenFisico();
    
    return {
        ...empty,
        signosVitales: {
            // IMPORTANTE: Solo usar campos con prefijo SV_ (nuevos)
            // NO usar campos viejos sin prefijo (FC, FR, Presion, Temperatura, etc.)
            // Esos datos ahora vienen desde Controles de Enfermería
            pa: record.SV_PA || "",
            fc: record.SV_FC || "",
            fr: record.SV_FR || "",
            tax: record.SV_TAX || "",
            glucemia: record.SV_GLUCEMIA || "",
            impresionGeneral: record.SV_IMPRESIONGENERAL || "",
            facie: record.SV_FACIE || "",
            decubito: record.SV_DECUBITO || "",
            marcha: record.SV_MARCHA || "",
            talla: record.SV_TALLA || "",
            pesoActual: record.SV_PESOACTUAL || "",
            pesoHabitual: record.SV_PESOHABITUAL || "",
            estadoNutricional: record.SV_ESTADONUTRICIONAL || "",
        },
        piel: {
            coloracion: record.PF_COLORACION || "",
            humedad: record.PF_HUMEDAD || "",
            temperatura: record.PF_TEMPERATURA || "",
            elasticidad: record.PF_ELASTICIDAD || "",
            unas: record.PF_UNAS || "",
            distribucionPilosa: record.PF_DISTRIBUCIONPILOSA || "",
            cicatrices: record.PF_CICATRICES || "",
        },
        tejidoCelularSubcutaneo: {
            distribucion: record.TCS_DISTRIBUCION || "",
            cantidad: record.TCS_CANTIDAD || "",
            nodulos: record.TCS_NODULOS || "",
            enfisema: record.TCS_ENFISEMA || "",
            edemas: record.TCS_EDEMAS || "",
        },
        sistemaLinfatico: {
            linfangitis: record.SL_LINFANGITIS || "",
            adenomegalias: record.SL_ADENOMEGALIAS || "",
        },
        cabeza: {
            forma: record.C_FORMA || "",
            tamano: record.C_TAMANO || "",
            ojos: record.C_OJOS || "",
            pupilas: record.C_PUPILAS || "",
            conjuntivas: record.C_CONJUNTIVAS || "",
            corneas: record.C_CORNEAS || "",
            escleroticas: record.C_ESCLEROTICAS || "",
            parpados: record.C_PARPADOS || "",
            fosasNasales: record.C_FOSASNASALES || "",
            boca: record.C_BOCA || "",
            labios: record.C_LABIOS || "",
            encias: record.C_ENCIAS || "",
            fauces: record.C_FAUCES || "",
            lengua: record.C_LENGUA || "",
            dientes: record.C_DIENTES || "",
            glandulasSalivales: record.C_GLANDULASSALIVALES || "",
            pabellonesAuricularesCAE: record.C_PABELLONESAURICULARESCAE || "",
        },
        aparatoRespiratorio: {
            torax: record.AR_TORAX || "",
            forma: record.AR_FORMA || "",
            elasticidad: record.AR_ELASTICIDAD || "",
            tipoRespiratorio: record.AR_TIPORESPIRATORIO || "",
            expansionDeVertices: record.AR_EXPANSIONDEVERTICES || "",
            vibracionesVocales: record.AR_VIBRACIONESVOCALES || "",
            expansionDeBases: record.AR_EXPANSIONDEBASES || "",
            percusion: record.AR_PERCUSION || "",
            auscultacion: record.AR_AUSCULTACION || "",
            observaciones: record.AR_OBSERVACIONES || record.AR_TEXTO || "",
        },
        aparatoCardiovascular: {
            frecuenciaCardiaca: record.AC_FRECUENCIACARDIACA || "",
            central: record.AC_CENTRAL || "",
            periferica: record.AC_PERIFERICA || "",
            pulsoradialCaracteristicas: record.AC_PULSORADIAL || "",
            rellenoCapilar: record.AC_RELLENOCAPILAR || "",
            latidoApexiano: record.AC_LATIDOAPEXIANO || "",
            latidosPalpables: record.AC_LATIDOSPALPABLES || "",
            r1: record.AC_R1 || "",
            r2: record.AC_R2 || "",
            rudosAgregados: record.AC_RUDOSAGREGADOS || "",
            frotes: record.AC_FROTES || "",
            soplos: record.AC_SOPLOS || "",
            observaciones: record.AC_OBSERVACIONES || record.AC_TEXTO || "",
        },
        cuello: {
            conformacion: record.CU_CONFORMACION || "",
            laringe: record.CU_LARINGE || "",
            huecoSupraclavicular: record.CU_HUECOSUPRACLAVICULAR || "",
            huecoInfraclavicular: record.CU_HUECOINFRACLAVICULAR || "",
            yugulares: record.CU_YUGULARES || "",
            tiroides: record.CU_TIROIDES || "",
        },
        sistemaVenoso: {
            varices: record.SV_VARICES || "",
            flebitis: record.SV_FLEBITIS || "",
            trombosis: record.SV_TROMBOSIS || "",
            circulacionColateral: record.SV_CIRCULACIONCOLATERAL || "",
        },
        sistemaOsteoArticuloMuscular: {
            musculo: record.SOAM_MUSCULO || "",
            huesos: record.SOAM_HUESOS || "",
            columnaVertebral: record.SOAM_COLUMNAVERTEBRAL || "",
            indiceTobilloBrazoDerecha: record.SOAM_INDICETOBILLOBRAZODERECHA || "",
            indiceTobilloBrazoIzquierda: record.SOAM_INDICETOBILLOBRAZOIZQUIERDA || "",
            perimetroDistalProximalMD: record.SOAM_PERIMETRODISTALPROXIMALMD || "",
            perimetroDistalProximalMI: record.SOAM_PERIMETRODISTALPROXIMALMI || "",
            articulaciones: record.SOAM_ARTICULACIONES || "",
        },
        mamas: {
            inspeccion: {
                tamano: record.M_INSP_TAMANO || "",
                superficie: record.M_INSP_SUPERFICIE || "",
                areolas: record.M_INSP_AREOLAS || "",
                pezones: record.M_INSP_PEZONES || "",
                maniobrapectorales: record.M_INSP_MANIOBRAPECTORALES || "",
                pielRetraccion: record.M_INSP_PIELRETRACCION === 1,
                elevacion: record.M_INSP_ELEVACION === 1,
                deNaranja: record.M_INSP_DENARANJA === 1,
                ulceras: record.M_INSP_ULCERAS === 1,
                observaciones: record.M_INSP_OBSERVACIONES || "",
            },
            palpacion: {
                limites: record.M_PALP_LIMITES || "",
                dolorosa: record.M_PALP_DOLOROSA || "",
                superficie: record.M_PALP_SUPERFICIE || "",
                consistencia: record.M_PALP_CONSISTENCIA || "",
                tumor: record.M_PALP_TUMOR || "",
                fluacionPiel: record.M_PALP_FLUACIONPIEL || "",
                derramePorPezon: record.M_PALP_DERRAMEPORPEZON || "",
            },
        },
        abdomen: {
            inspeccion: record.A_INSPECCION || "",
            palpacion: record.A_PALPACION || "",
            superficial: record.A_SUPERFICIAL || "",
            profunda: record.A_PROFUNDA || "",
            percusion: record.A_PERCUSION || "",
            higado: record.A_HIGADO || "",
            limiteSup: record.A_LIMITESUP || "",
            limiteInf: record.A_LIMITEINF || "",
            altura: record.A_ALTURA || "",
            caracteristicas: record.A_CARACTERISTICAS || "",
            auscultacion: record.A_AUSCULTACION || "",
            rha: record.A_RHA || "",
            soplos: record.A_SOPLOS || "",
            celdaEsplenica: record.A_CELDAESPLENICA || "",
            bazo: record.A_BAZO || "",
            perimetro: record.A_PERIMETRO || "",
            observaciones: record.A_OBSERVACIONES || record.A_TEXTO || "",
        },
        aparatoUrogenital: {
            genitalesExternos: record.AUG_GENITALESEXTERNOS || "",
            tactoVaginal: record.AUG_TACTOVAGINAL || "",
            tactoRectal: record.AUG_TACTORECTAL || "",
            punoPercusion: record.AUG_PUNOPERCUSION || "",
            puntosUretrales: record.AUG_PUNTOSURETRALES || "",
            observaciones: record.AUG_OBSERVACIONES || "",
        },
        impresionDiagnostica: {
            impresionDiagnostica: record.IMPRESIONDIAGNOSTICA || "",
            comentarioDeIngreso: record.COMENTARIODEINGRESO || "",
        },
    };
};

/**
 * Mapea estado del formulario a campos de BD (imHCI)
 */
export const mapearExamenFisicoAHCI = (examenFisico: ExamenFisicoCompleto): Record<string, any> => {
    const datos: Record<string, any> = {};
    
    // Signos Vitales - SOLO campos con prefijo SV_
    // NO guardar en campos viejos (FC, FR, Presion, Temperatura) - esos son de Controles de Enfermería
    if (examenFisico.signosVitales.fc) datos.SV_FC = examenFisico.signosVitales.fc;
    if (examenFisico.signosVitales.fr) datos.SV_FR = examenFisico.signosVitales.fr;
    if (examenFisico.signosVitales.tax) datos.SV_TAX = examenFisico.signosVitales.tax;
    if (examenFisico.signosVitales.pa) datos.SV_PA = examenFisico.signosVitales.pa;
    if (examenFisico.signosVitales.glucemia) datos.SV_GLUCEMIA = examenFisico.signosVitales.glucemia;
    if (examenFisico.signosVitales.talla) datos.SV_TALLA = examenFisico.signosVitales.talla;
    if (examenFisico.signosVitales.pesoActual) datos.SV_PESOACTUAL = examenFisico.signosVitales.pesoActual;
    if (examenFisico.signosVitales.pesoHabitual) datos.SV_PESOHABITUAL = examenFisico.signosVitales.pesoHabitual;
    if (examenFisico.signosVitales.estadoNutricional) datos.SV_ESTADONUTRICIONAL = examenFisico.signosVitales.estadoNutricional;
    if (examenFisico.signosVitales.impresionGeneral) datos.SV_IMPRESIONGENERAL = examenFisico.signosVitales.impresionGeneral;
    if (examenFisico.signosVitales.facie) datos.SV_FACIE = examenFisico.signosVitales.facie;
    if (examenFisico.signosVitales.decubito) datos.SV_DECUBITO = examenFisico.signosVitales.decubito;
    if (examenFisico.signosVitales.marcha) datos.SV_MARCHA = examenFisico.signosVitales.marcha;
    
    // Piel y Faneras
    if (examenFisico.piel.coloracion) datos.PF_COLORACION = examenFisico.piel.coloracion;
    if (examenFisico.piel.humedad) datos.PF_HUMEDAD = examenFisico.piel.humedad;
    if (examenFisico.piel.temperatura) datos.PF_TEMPERATURA = examenFisico.piel.temperatura;
    if (examenFisico.piel.elasticidad) datos.PF_ELASTICIDAD = examenFisico.piel.elasticidad;
    if (examenFisico.piel.unas) datos.PF_UNAS = examenFisico.piel.unas;
    if (examenFisico.piel.distribucionPilosa) datos.PF_DISTRIBUCIONPILOSA = examenFisico.piel.distribucionPilosa;
    if (examenFisico.piel.cicatrices) datos.PF_CICATRICES = examenFisico.piel.cicatrices;
    
    // Tejido Celular Subcutáneo
    if (examenFisico.tejidoCelularSubcutaneo.distribucion) datos.TCS_DISTRIBUCION = examenFisico.tejidoCelularSubcutaneo.distribucion;
    if (examenFisico.tejidoCelularSubcutaneo.cantidad) datos.TCS_CANTIDAD = examenFisico.tejidoCelularSubcutaneo.cantidad;
    if (examenFisico.tejidoCelularSubcutaneo.nodulos) datos.TCS_NODULOS = examenFisico.tejidoCelularSubcutaneo.nodulos;
    if (examenFisico.tejidoCelularSubcutaneo.enfisema) datos.TCS_ENFISEMA = examenFisico.tejidoCelularSubcutaneo.enfisema;
    if (examenFisico.tejidoCelularSubcutaneo.edemas) datos.TCS_EDEMAS = examenFisico.tejidoCelularSubcutaneo.edemas;
    
    // Sistema Linfático
    if (examenFisico.sistemaLinfatico.linfangitis) datos.SL_LINFANGITIS = examenFisico.sistemaLinfatico.linfangitis;
    if (examenFisico.sistemaLinfatico.adenomegalias) datos.SL_ADENOMEGALIAS = examenFisico.sistemaLinfatico.adenomegalias;
    
    // Cabeza
    if (examenFisico.cabeza.forma) datos.C_FORMA = examenFisico.cabeza.forma;
    if (examenFisico.cabeza.tamano) datos.C_TAMANO = examenFisico.cabeza.tamano;
    if (examenFisico.cabeza.ojos) datos.C_OJOS = examenFisico.cabeza.ojos;
    if (examenFisico.cabeza.pupilas) datos.C_PUPILAS = examenFisico.cabeza.pupilas;
    if (examenFisico.cabeza.conjuntivas) datos.C_CONJUNTIVAS = examenFisico.cabeza.conjuntivas;
    if (examenFisico.cabeza.corneas) datos.C_CORNEAS = examenFisico.cabeza.corneas;
    if (examenFisico.cabeza.escleroticas) datos.C_ESCLEROTICAS = examenFisico.cabeza.escleroticas;
    if (examenFisico.cabeza.parpados) datos.C_PARPADOS = examenFisico.cabeza.parpados;
    if (examenFisico.cabeza.fosasNasales) datos.C_FOSASNASALES = examenFisico.cabeza.fosasNasales;
    if (examenFisico.cabeza.boca) datos.C_BOCA = examenFisico.cabeza.boca;
    if (examenFisico.cabeza.labios) datos.C_LABIOS = examenFisico.cabeza.labios;
    if (examenFisico.cabeza.encias) datos.C_ENCIAS = examenFisico.cabeza.encias;
    if (examenFisico.cabeza.fauces) datos.C_FAUCES = examenFisico.cabeza.fauces;
    if (examenFisico.cabeza.lengua) datos.C_LENGUA = examenFisico.cabeza.lengua;
    if (examenFisico.cabeza.dientes) datos.C_DIENTES = examenFisico.cabeza.dientes;
    if (examenFisico.cabeza.glandulasSalivales) datos.C_GLANDULASSALIVALES = examenFisico.cabeza.glandulasSalivales;
    if (examenFisico.cabeza.pabellonesAuricularesCAE) datos.C_PABELLONESAURICULARESCAE = examenFisico.cabeza.pabellonesAuricularesCAE;
    
    // Aparato Respiratorio
    if (examenFisico.aparatoRespiratorio.torax) datos.AR_TORAX = examenFisico.aparatoRespiratorio.torax;
    if (examenFisico.aparatoRespiratorio.forma) datos.AR_FORMA = examenFisico.aparatoRespiratorio.forma;
    if (examenFisico.aparatoRespiratorio.elasticidad) datos.AR_ELASTICIDAD = examenFisico.aparatoRespiratorio.elasticidad;
    if (examenFisico.aparatoRespiratorio.tipoRespiratorio) datos.AR_TIPORESPIRATORIO = examenFisico.aparatoRespiratorio.tipoRespiratorio;
    if (examenFisico.aparatoRespiratorio.expansionDeVertices) datos.AR_EXPANSIONDEVERTICES = examenFisico.aparatoRespiratorio.expansionDeVertices;
    if (examenFisico.aparatoRespiratorio.vibracionesVocales) datos.AR_VIBRACIONESVOCALES = examenFisico.aparatoRespiratorio.vibracionesVocales;
    if (examenFisico.aparatoRespiratorio.expansionDeBases) datos.AR_EXPANSIONDEBASES = examenFisico.aparatoRespiratorio.expansionDeBases;
    if (examenFisico.aparatoRespiratorio.percusion) datos.AR_PERCUSION = examenFisico.aparatoRespiratorio.percusion;
    if (examenFisico.aparatoRespiratorio.auscultacion) datos.AR_AUSCULTACION = examenFisico.aparatoRespiratorio.auscultacion;
    if (examenFisico.aparatoRespiratorio.observaciones) datos.AR_OBSERVACIONES = examenFisico.aparatoRespiratorio.observaciones;
    
    // Aparato Cardiovascular
    if (examenFisico.aparatoCardiovascular.frecuenciaCardiaca) datos.AC_FRECUENCIACARDIACA = examenFisico.aparatoCardiovascular.frecuenciaCardiaca;
    if (examenFisico.aparatoCardiovascular.central) datos.AC_CENTRAL = examenFisico.aparatoCardiovascular.central;
    if (examenFisico.aparatoCardiovascular.periferica) datos.AC_PERIFERICA = examenFisico.aparatoCardiovascular.periferica;
    if (examenFisico.aparatoCardiovascular.pulsoradialCaracteristicas) datos.AC_PULSORADIAL = examenFisico.aparatoCardiovascular.pulsoradialCaracteristicas;
    if (examenFisico.aparatoCardiovascular.rellenoCapilar) datos.AC_RELLENOCAPILAR = examenFisico.aparatoCardiovascular.rellenoCapilar;
    if (examenFisico.aparatoCardiovascular.latidoApexiano) datos.AC_LATIDOAPEXIANO = examenFisico.aparatoCardiovascular.latidoApexiano;
    if (examenFisico.aparatoCardiovascular.latidosPalpables) datos.AC_LATIDOSPALPABLES = examenFisico.aparatoCardiovascular.latidosPalpables;
    if (examenFisico.aparatoCardiovascular.r1) datos.AC_R1 = examenFisico.aparatoCardiovascular.r1;
    if (examenFisico.aparatoCardiovascular.r2) datos.AC_R2 = examenFisico.aparatoCardiovascular.r2;
    if (examenFisico.aparatoCardiovascular.rudosAgregados) datos.AC_RUDOSAGREGADOS = examenFisico.aparatoCardiovascular.rudosAgregados;
    if (examenFisico.aparatoCardiovascular.frotes) datos.AC_FROTES = examenFisico.aparatoCardiovascular.frotes;
    if (examenFisico.aparatoCardiovascular.soplos) datos.AC_SOPLOS = examenFisico.aparatoCardiovascular.soplos;
    if (examenFisico.aparatoCardiovascular.observaciones) datos.AC_OBSERVACIONES = examenFisico.aparatoCardiovascular.observaciones;
    
    // Cuello
    if (examenFisico.cuello.conformacion) datos.CU_CONFORMACION = examenFisico.cuello.conformacion;
    if (examenFisico.cuello.laringe) datos.CU_LARINGE = examenFisico.cuello.laringe;
    if (examenFisico.cuello.huecoSupraclavicular) datos.CU_HUECOSUPRACLAVICULAR = examenFisico.cuello.huecoSupraclavicular;
    if (examenFisico.cuello.huecoInfraclavicular) datos.CU_HUECOINFRACLAVICULAR = examenFisico.cuello.huecoInfraclavicular;
    if (examenFisico.cuello.yugulares) datos.CU_YUGULARES = examenFisico.cuello.yugulares;
    if (examenFisico.cuello.tiroides) datos.CU_TIROIDES = examenFisico.cuello.tiroides;
    
    // Sistema Venoso
    if (examenFisico.sistemaVenoso.varices) datos.SV_VARICES = examenFisico.sistemaVenoso.varices;
    if (examenFisico.sistemaVenoso.flebitis) datos.SV_FLEBITIS = examenFisico.sistemaVenoso.flebitis;
    if (examenFisico.sistemaVenoso.trombosis) datos.SV_TROMBOSIS = examenFisico.sistemaVenoso.trombosis;
    if (examenFisico.sistemaVenoso.circulacionColateral) datos.SV_CIRCULACIONCOLATERAL = examenFisico.sistemaVenoso.circulacionColateral;
    
    // Sistema Osteo-Artículo-Muscular
    if (examenFisico.sistemaOsteoArticuloMuscular.musculo) datos.SOAM_MUSCULO = examenFisico.sistemaOsteoArticuloMuscular.musculo;
    if (examenFisico.sistemaOsteoArticuloMuscular.huesos) datos.SOAM_HUESOS = examenFisico.sistemaOsteoArticuloMuscular.huesos;
    if (examenFisico.sistemaOsteoArticuloMuscular.columnaVertebral) datos.SOAM_COLUMNAVERTEBRAL = examenFisico.sistemaOsteoArticuloMuscular.columnaVertebral;
    if (examenFisico.sistemaOsteoArticuloMuscular.indiceTobilloBrazoDerecha) datos.SOAM_INDICETOBILLOBRAZODERECHA = examenFisico.sistemaOsteoArticuloMuscular.indiceTobilloBrazoDerecha;
    if (examenFisico.sistemaOsteoArticuloMuscular.indiceTobilloBrazoIzquierda) datos.SOAM_INDICETOBILLOBRAZOIZQUIERDA = examenFisico.sistemaOsteoArticuloMuscular.indiceTobilloBrazoIzquierda;
    if (examenFisico.sistemaOsteoArticuloMuscular.perimetroDistalProximalMD) datos.SOAM_PERIMETRODISTALPROXIMALMD = examenFisico.sistemaOsteoArticuloMuscular.perimetroDistalProximalMD;
    if (examenFisico.sistemaOsteoArticuloMuscular.perimetroDistalProximalMI) datos.SOAM_PERIMETRODISTALPROXIMALMI = examenFisico.sistemaOsteoArticuloMuscular.perimetroDistalProximalMI;
    if (examenFisico.sistemaOsteoArticuloMuscular.articulaciones) datos.SOAM_ARTICULACIONES = examenFisico.sistemaOsteoArticuloMuscular.articulaciones;
    
    // Mamas
    if (examenFisico.mamas.inspeccion.tamano) datos.M_INSP_TAMANO = examenFisico.mamas.inspeccion.tamano;
    if (examenFisico.mamas.inspeccion.superficie) datos.M_INSP_SUPERFICIE = examenFisico.mamas.inspeccion.superficie;
    if (examenFisico.mamas.inspeccion.areolas) datos.M_INSP_AREOLAS = examenFisico.mamas.inspeccion.areolas;
    if (examenFisico.mamas.inspeccion.pezones) datos.M_INSP_PEZONES = examenFisico.mamas.inspeccion.pezones;
    if (examenFisico.mamas.inspeccion.maniobrapectorales) datos.M_INSP_MANIOBRAPECTORALES = examenFisico.mamas.inspeccion.maniobrapectorales;
    datos.M_INSP_PIELRETRACCION = examenFisico.mamas.inspeccion.pielRetraccion ? 1 : 0;
    datos.M_INSP_ELEVACION = examenFisico.mamas.inspeccion.elevacion ? 1 : 0;
    datos.M_INSP_DENARANJA = examenFisico.mamas.inspeccion.deNaranja ? 1 : 0;
    datos.M_INSP_ULCERAS = examenFisico.mamas.inspeccion.ulceras ? 1 : 0;
    if (examenFisico.mamas.inspeccion.observaciones) datos.M_INSP_OBSERVACIONES = examenFisico.mamas.inspeccion.observaciones;
    if (examenFisico.mamas.palpacion.limites) datos.M_PALP_LIMITES = examenFisico.mamas.palpacion.limites;
    if (examenFisico.mamas.palpacion.dolorosa) datos.M_PALP_DOLOROSA = examenFisico.mamas.palpacion.dolorosa;
    if (examenFisico.mamas.palpacion.superficie) datos.M_PALP_SUPERFICIE = examenFisico.mamas.palpacion.superficie;
    if (examenFisico.mamas.palpacion.consistencia) datos.M_PALP_CONSISTENCIA = examenFisico.mamas.palpacion.consistencia;
    if (examenFisico.mamas.palpacion.tumor) datos.M_PALP_TUMOR = examenFisico.mamas.palpacion.tumor;
    if (examenFisico.mamas.palpacion.fluacionPiel) datos.M_PALP_FLUACIONPIEL = examenFisico.mamas.palpacion.fluacionPiel;
    if (examenFisico.mamas.palpacion.derramePorPezon) datos.M_PALP_DERRAMEPORPEZON = examenFisico.mamas.palpacion.derramePorPezon;
    
    // Abdomen
    if (examenFisico.abdomen.inspeccion) datos.A_INSPECCION = examenFisico.abdomen.inspeccion;
    if (examenFisico.abdomen.palpacion) datos.A_PALPACION = examenFisico.abdomen.palpacion;
    if (examenFisico.abdomen.superficial) datos.A_SUPERFICIAL = examenFisico.abdomen.superficial;
    if (examenFisico.abdomen.profunda) datos.A_PROFUNDA = examenFisico.abdomen.profunda;
    if (examenFisico.abdomen.percusion) datos.A_PERCUSION = examenFisico.abdomen.percusion;
    if (examenFisico.abdomen.higado) datos.A_HIGADO = examenFisico.abdomen.higado;
    if (examenFisico.abdomen.limiteSup) datos.A_LIMITESUP = examenFisico.abdomen.limiteSup;
    if (examenFisico.abdomen.limiteInf) datos.A_LIMITEINF = examenFisico.abdomen.limiteInf;
    if (examenFisico.abdomen.altura) datos.A_ALTURA = examenFisico.abdomen.altura;
    if (examenFisico.abdomen.caracteristicas) datos.A_CARACTERISTICAS = examenFisico.abdomen.caracteristicas;
    if (examenFisico.abdomen.auscultacion) datos.A_AUSCULTACION = examenFisico.abdomen.auscultacion;
    if (examenFisico.abdomen.rha) datos.A_RHA = examenFisico.abdomen.rha;
    if (examenFisico.abdomen.soplos) datos.A_SOPLOS = examenFisico.abdomen.soplos;
    if (examenFisico.abdomen.celdaEsplenica) datos.A_CELDAESPLENICA = examenFisico.abdomen.celdaEsplenica;
    if (examenFisico.abdomen.bazo) datos.A_BAZO = examenFisico.abdomen.bazo;
    if (examenFisico.abdomen.perimetro) datos.A_PERIMETRO = examenFisico.abdomen.perimetro;
    if (examenFisico.abdomen.observaciones) datos.A_OBSERVACIONES = examenFisico.abdomen.observaciones;
    
    // Aparato Urogenital
    if (examenFisico.aparatoUrogenital.genitalesExternos) datos.AUG_GENITALESEXTERNOS = examenFisico.aparatoUrogenital.genitalesExternos;
    if (examenFisico.aparatoUrogenital.tactoVaginal) datos.AUG_TACTOVAGINAL = examenFisico.aparatoUrogenital.tactoVaginal;
    if (examenFisico.aparatoUrogenital.tactoRectal) datos.AUG_TACTORECTAL = examenFisico.aparatoUrogenital.tactoRectal;
    if (examenFisico.aparatoUrogenital.punoPercusion) datos.AUG_PUNOPERCUSION = examenFisico.aparatoUrogenital.punoPercusion;
    if (examenFisico.aparatoUrogenital.puntosUretrales) datos.AUG_PUNTOSURETRALES = examenFisico.aparatoUrogenital.puntosUretrales;
    if (examenFisico.aparatoUrogenital.observaciones) datos.AUG_OBSERVACIONES = examenFisico.aparatoUrogenital.observaciones;
    
    // Impresión Diagnóstica
    if (examenFisico.impresionDiagnostica.impresionDiagnostica) datos.IMPRESIONDIAGNOSTICA = examenFisico.impresionDiagnostica.impresionDiagnostica;
    if (examenFisico.impresionDiagnostica.comentarioDeIngreso) datos.COMENTARIODEINGRESO = examenFisico.impresionDiagnostica.comentarioDeIngreso;
    
    return datos;
};

export const getEmptyExamenFisico = (): ExamenFisicoCompleto => ({
    antecedentesPersonales: {
        delMedioYLaborales: {
            residenciaActual: "",
            residenciasAnteriores: "",
        },
        habitos: {
            estudios: "",
            ocupacion: "",
            alcoholYToxicos: "",
            alimentacionHabitosAlimenticiosYVenenos: "",
            sexualidad: "",
            deportes: "",
            catarsis: "",
            tabaco: "",
            otrasAdicciones: "",
        },
        patologicos: {
            infectoContagiosas: "",
            vacunas: "",
            cardiovasculares: "",
            gastrointestinales: "",
            respiratorias: "",
            urinarias: "",
            hematologicos: "",
            alergicos: "",
            quirurgicosYTraumatologicos: "",
            dermatologicos: "",
            oftalmologicos: "",
        },
        ginecologicos: {
            quirurgicos: "",
            menarca: "",
            ritmo: "",
            fum: "",
            abortos: "",
            gestas: "",
            partos: "",
        },
        familiares: {
            anticoncepcion: "",
            antecedetesFamiliares: "",
            hijos: "",
        },
    },
    piel: {
        coloracion: "",
        humedad: "",
        temperatura: "",
        elasticidad: "",
        unas: "",
        distribucionPilosa: "",
        cicatrices: "",
    },
    tejidoCelularSubcutaneo: {
        distribucion: "",
        cantidad: "",
        nodulos: "",
        enfisema: "",
        edemas: "",
    },
    sistemaLinfatico: {
        linfangitis: "",
        adenomegalias: "",
    },
    sistemaOsteoArticuloMuscular: {
        musculo: "",
        huesos: "",
        columnaVertebral: "",
        indiceTobilloBrazoDerecha: "",
        indiceTobilloBrazoIzquierda: "",
        perimetroDistalProximalMD: "",
        perimetroDistalProximalMI: "",
        articulaciones: "",
    },
    cabeza: {
        forma: "",
        tamano: "",
        ojos: "",
        pupilas: "",
        conjuntivas: "",
        corneas: "",
        escleroticas: "",
        parpados: "",
        fosasNasales: "",
        boca: "",
        labios: "",
        encias: "",
        fauces: "",
        lengua: "",
        dientes: "",
        glandulasSalivales: "",
        pabellonesAuricularesCAE: "",
    },
    cuello: {
        conformacion: "",
        laringe: "",
        huecoSupraclavicular: "",
        huecoInfraclavicular: "",
        yugulares: "",
        tiroides: "",
    },
    sistemaVenoso: {
        varices: "",
        flebitis: "",
        trombosis: "",
        circulacionColateral: "",
    },
    mamas: {
        inspeccion: {
            tamano: "",
            superficie: "",
            areolas: "",
            pezones: "",
            maniobrapectorales: "",
            pielRetraccion: false,
            elevacion: false,
            deNaranja: false,
            ulceras: false,
            observaciones: "",
        },
        palpacion: {
            limites: "",
            dolorosa: "",
            superficie: "",
            consistencia: "",
            tumor: "",
            fluacionPiel: "",
            derramePorPezon: "",
        },
    },
    aparatoRespiratorio: {
        torax: "",
        forma: "",
        elasticidad: "",
        tipoRespiratorio: "",
        expansionDeVertices: "",
        vibracionesVocales: "",
        expansionDeBases: "",
        percusion: "",
        auscultacion: "",
        observaciones: "",
    },
    aparatoCardiovascular: {
        frecuenciaCardiaca: "",
        central: "",
        periferica: "",
        pulsoradialCaracteristicas: "",
        rellenoCapilar: "",
        latidoApexiano: "",
        latidosPalpables: "",
        r1: "",
        r2: "",
        rudosAgregados: "",
        frotes: "",
        soplos: "",
        observaciones: "",
    },
    abdomen: {
        inspeccion: "",
        palpacion: "",
        superficial: "",
        profunda: "",
        percusion: "",
        higado: "",
        limiteSup: "",
        limiteInf: "",
        altura: "",
        caracteristicas: "",
        auscultacion: "",
        rha: "",
        soplos: "",
        celdaEsplenica: "",
        bazo: "",
        perimetro: "",
        observaciones: "",
    },
    aparatoUrogenital: {
        genitalesExternos: "",
        tactoVaginal: "",
        tactoRectal: "",
        punoPercusion: "",
        puntosUretrales: "",
        observaciones: "",
    },
    examenGinecologico: {
        montedevenus: "",
        labiosMayoresMenores: "",
        clitoris: "",
        introito: "",
        vagina: "",
        fondoSacoVaginal: "",
        cervix: "",
        utero: "",
        anexos: "",
        examenAbVaRe: "",
        especuloscopia: "",
        observaciones: "",
    },
    examenObstetrico: {
        au: "",
        lcf: "",
        mfa: "",
        du: "",
        tono: "",
        leopold: "",
        tactoVaginal: "",
        bishopP: "",
        bishopR: "",
        bishopE: "",
        bishopL: "",
        bishopD: "",
        membranasOvulares: "",
        maniobraDeTamer: "",
        plano: "",
        pelvimetria: "",
        hidrorrea: "",
        ginecorragia: "",
        loquios: "",
        retraccion: "",
        mamas: "",
        lactancia: "",
        perine: "",
        especuloscopia: "",
        tbm: "",
        diagnostico: "",
    },
    sistemaNervioso: {
        conciencia: "",
        marcha: "",
        tonoMuscular: "",
        fuerzaMuscular: "",
        signosPiramidales: "",
        sensibilidadSuperficial: "",
        signosMeningeos: "",
        paresCraneanos: "",
        taxia: "",
        praxia: "",
    },
    signosVitales: {
        pa: "",
        fc: "",
        fr: "",
        tax: "",
        glucemia: "",
        impresionGeneral: "",
        facie: "",
        decubito: "",
        marcha: "",
        talla: "",
        pesoActual: "",
        pesoHabitual: "",
        estadoNutricional: "",
    },
    examenOftalmologico: {
        fondoDeOjo: "",
        mediosBirefringentes: "",
        cruces: "",
        relacion: "",
        hemorragiaExudados: "",
    },
    electrocardiograma: {
        ritmo: "",
        frecuencia: "",
        pr: "",
        qt: "",
        ondapEje: "",
        duracion: "",
        amplitud: "",
        conformacion: "",
        qrsEje: "",
        duracionQrs: "",
        ondat: "",
        st: "",
        conclusiones: "",
    },
    radiografiaTorax: {
        tecnica: "",
        partesBlandas: "",
        partesOseas: "",
        hemidiafragmas: "",
        ict: "",
        senosCostofrenicos: "",
        mediastino: "",
        siluetaCardiovascular: "",
        hilios: "",
        camposPulmonares: "",
        conclusiones: "",
        laboratorio: "",
    },
    impresionDiagnostica: {
        impresionDiagnostica: "",
        comentarioDeIngreso: "",
    },
    planDiagnostico: {
        a: "",
        b: "",
        c: "",
        d: "",
        e: "",
        f: "",
        g: "",
        h: "",
        i: "",
        j: "",
        k: "",
    },
    planTerapeutico: {
        pt1: "",
        pt2: "",
        pt3: "",
        pt4: "",
        pt5: "",
        pt6: "",
        pt7: "",
        pt8: "",
        pt9: "",
        pt10: "",
        pt11: "",
        pt12: "",
        pt13: "",
        pt14: "",
        pt15: "",
    },
    examenesComplementarios: {
        detalle: "",
    },
});
