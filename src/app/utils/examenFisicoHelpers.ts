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
            observaciones: record.AR_TEXTO || "",
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
            observaciones: record.AC_TEXTO || "",
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
            observaciones: record.A_TEXTO || "",
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
    
    // Aparato Respiratorio
    if (examenFisico.aparatoRespiratorio.observaciones) datos.AR_TEXTO = examenFisico.aparatoRespiratorio.observaciones;
    
    // Aparato Cardiovascular
    if (examenFisico.aparatoCardiovascular.observaciones) datos.AC_TEXTO = examenFisico.aparatoCardiovascular.observaciones;
    
    // Abdomen
    if (examenFisico.abdomen.perimetro) datos.A_PERIMETRO = examenFisico.abdomen.perimetro;
    if (examenFisico.abdomen.observaciones) datos.A_TEXTO = examenFisico.abdomen.observaciones;
    
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
