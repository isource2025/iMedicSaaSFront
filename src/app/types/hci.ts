/**
 * Tipos TypeScript para Historia Clínica de Ingreso (imHCI)
 * Basado en la estructura real de la tabla en la base de datos
 */

export interface HCIItem {
  // Campos básicos
  idHCIngreso: number;
  numeroVisita: number;
  fecha: string;
  idSector: string;
  idProfecional: number;
  motivoConsulta: string;
  enfermedadActual: string;
  modMedica?: string;
  semiologia?: string;
  
  // Signos Vitales (SV_)
  sv_glucemia?: string;
  sv_pa?: string;
  sv_fc?: string;
  sv_fr?: string;
  sv_tax?: string;
  sv_impresiongeneral?: string;
  sv_facie?: string;
  sv_decubito?: string;
  sv_marcha?: string;
  sv_talla?: string;
  sv_pesoactual?: string;
  sv_pesohabitual?: string;
  sv_estadonutricional?: string;
  sv_varices?: string;
  sv_flebitis?: string;
  sv_trombosis?: string;
  sv_circulacioncolateral?: string;
  sv_texto?: string;
  
  // Piel y Faneras (PF_)
  pf_coloracion?: string;
  pf_humedad?: string;
  pf_temperatura?: string;
  pf_distribucionpilosa?: string;
  pf_elasticidad?: string;
  pf_unias?: string;
  pf_cicatrices?: string;
  pf_texto?: string;
  
  // Tejido Celular Subcutáneo (TCS_)
  tcs_distribucion?: string;
  tcs_cantidad?: string;
  tcs_nodulos?: string;
  tcs_enfisema?: string;
  tcs_edemas?: string;
  tcs_texto?: string;
  
  // Sistema Linfático (SL_)
  sl_linfangitis?: string;
  sl_adenomegalias?: string;
  sl_texto?: string;
  
  // Sistema Osteoarticulomuscular (SOAM_)
  soam_musculotrofismosensibilidad?: string;
  soam_huesos?: string;
  soam_columnavertebral?: string;
  soam_articulaciones?: string;
  soam_indicetobillobrazoderecha?: string;
  soam_indicetobillobrazoizquiera?: string;
  soam_perimetromid?: string;
  soam_perimetromii?: string;
  soam_texto?: string;
  
  // Cabeza (C_)
  c_forma?: string;
  c_tamanio?: string;
  c_ojos?: string;
  c_pupilas?: string;
  c_conjuntivas?: string;
  c_corneas?: string;
  c_escleroticas?: string;
  c_parpados?: string;
  c_fosasnasales?: string;
  c_boca?: string;
  c_labios?: string;
  c_encias?: string;
  c_fauces?: string;
  c_lengua?: string;
  c_dientes?: string;
  c_glandulassalivales?: string;
  c_pabellonesauricularesycae?: string;
  c_texto?: string;
  
  // Cuello (CU_)
  cu_conformacion?: string;
  cu_laringe?: string;
  cu_huecosupraclavicular?: string;
  cu_huecoinfraclavicular?: string;
  cu_yugulares?: string;
  cu_tiroides?: string;
  cu_texto?: string;
  
  // Mamas (M_, MI_, MP_)
  m_simetria?: string;
  m_nodulos?: string;
  mi_tamano?: string;
  mi_superficie?: string;
  mi_areolas?: string;
  mi_pezones?: string;
  mi_maniobrapectorales?: string;
  mi_pielretraccion?: number;
  mi_elevacion?: number;
  mi_denaranja?: number;
  mi_ulceras?: number;
  mi_texto?: string;
  mp_limites?: string;
  mp_dolorosa?: string;
  mp_superficie?: string;
  mp_consistencia?: string;
  mp_tumor?: string;
  mp_fijacionpiel?: string;
  mp_derrameporpezon?: string;
  
  // Aparato Respiratorio (AR_)
  ar_torax?: string;
  ar_forma?: string;
  ar_elasticidad?: string;
  ar_tiporespiratorio?: string;
  ar_expansiondevertices?: string;
  ar_bases?: string;
  ar_vibracionesvocales?: string;
  ar_inspeccion?: string;
  ar_palpacion?: string;
  ar_percusion?: string;
  ar_auscultacion?: string;
  ar_texto?: string;
  
  // Aparato Cardiovascular (AC_)
  ac_frecuenciacardiaca?: string;
  ac_central?: string;
  ac_periferica?: string;
  ac_pulsoradial?: string;
  ac_rellenoapilar?: string;
  ac_latidoapexiano?: string;
  ac_latidopalpables?: string;
  ac_auscultacion?: string;
  ac_r1?: string;
  ac_r2?: string;
  ac_ruidosagregados?: string;
  ac_frotes?: string;
  ac_soplos?: string;
  ac_palpacion?: string;
  ac_pulsos?: string;
  ac_texto?: string;
  
  // Abdomen (A_)
  a_inspeccion?: string;
  a_palpacion?: string;
  a_superficial?: string;
  a_profunda?: string;
  a_percusion?: string;
  a_higado?: string;
  a_limtesup?: string;
  a_limteinf?: string;
  a_altura?: string;
  a_caracteristicas?: string;
  a_auscultacion?: string;
  a_rha?: string;
  a_soplos?: string;
  a_celdaesplenica?: string;
  a_bazo?: string;
  a_perimetro?: string;
  a_texto?: string;
  
  // Aparato Urogenital/Intestinal (AUG_, AIG_)
  aug_genitalesexternos?: string;
  aug_tactovaginal?: string;
  aig_tactorectal?: string;
  aug_puniopercusion?: string;
  aug_puntosuretrales?: string;
  aug_texto?: string;
  
  // Sistema Nervioso (SN_)
  sn_conciencia?: string;
  sn_marcha?: string;
  sn_tonomuscular?: string;
  sn_fuerzamuscular?: string;
  sn_signospiramidales?: string;
  sn_sensibilidadsuperficial?: string;
  sn_signosmeningeos?: string;
  sn_parescraneanos?: string;
  sn_taxia?: string;
  sn_praxia?: string;
  sn_texto?: string;
  
  // Examen Oftalmológico (EO_) - 35 campos
  eo_fondodeojo?: string;
  eo_mediosbirefrigentes?: string;
  eo_cruces?: string;
  eo_relacion?: string;
  eo_hemorragiaexudados?: string;
  eo_au?: string;
  eo_tono?: string;
  eo_lcf?: string;
  eo_mfa?: string;
  eo_du?: string;
  eo_leopold?: string;
  eo_tactovaginal?: string;
  eo_bishop_p?: string;
  eo_bishop_r?: string;
  eo_bishop_e?: string;
  eo_bishop_l?: string;
  eo_bishop_d?: string;
  eo_membranasovulares?: string;
  eo_maniobradetamier?: string;
  eo_plano?: string;
  eo_pelvimetria?: string;
  eo_hidrorrea?: string;
  eo_ginecorragia?: string;
  eo_loquios?: string;
  eo_retraccion?: string;
  eo_mamas?: string;
  eo_lactancia?: string;
  eo_perine?: string;
  eo_especuloscopia?: string;
  eo_tbm?: string;
  eo_diagnostico?: string;
  eo_refraccion?: string;
  eo_biomoscropia?: string;
  eo_tonometria?: string;
  eo_practicaquirurgica?: string;
  
  // Electrocardiograma (EC_)
  ec_ritmo?: string;
  ec_frecuencia?: string;
  ec_pr?: string;
  ec_qt?: string;
  ec_ondap?: string;
  ec_duracion?: string;
  ec_amplitud?: string;
  ec_conformacion?: string;
  ec_qrs?: string;
  ec_duracion1?: string;
  ec_ondat?: string;
  ec_st?: string;
  ec_eje?: string;
  ec_conclusiones?: string;
  
  // Radiología de Tórax (RDT_)
  rdt_datetime?: string;
  rdt_tecnica?: string;
  rdt_partesblandas?: string;
  rdt_partesoseas?: string;
  rdt_hemidiafragmas?: string;
  rdt_ict?: string;
  rdt_senoscostofrenicos?: string;
  rdt_mediastino?: string;
  rdt_siluetacardiovascular?: string;
  rdt_hilios?: string;
  rdt_campospulmonares?: string;
  rdt_conclusiones?: string;
  rdt_posicion?: string;
  rdt_parenquima?: string;
  rdt_laboratorio?: string;
  
  // Procedimientos Diagnósticos (PD_)
  pd_a?: string;
  pd_b?: string;
  pd_c?: string;
  pd_d?: string;
  pd_e?: string;
  pd_f?: string;
  pd_g?: string;
  pd_h?: string;
  pd_i?: string;
  pd_j?: string;
  pd_k?: string;
  
  // Procedimientos Terapéuticos (PT_)
  pt_1?: string;
  pt_2?: string;
  pt_3?: string;
  pt_4?: string;
  pt_5?: string;
  pt_6?: string;
  pt_7?: string;
  pt_8?: string;
  pt_9?: string;
  pt_10?: string;
  pt_11?: string;
  pt_12?: string;
  pt_13?: string;
  pt_14?: string;
  pt_15?: string;
  
  // Aparato Digestivo (AD_)
  ad_inspeccion?: string;
  ad_palpacion?: string;
  ad_percusion?: string;
  ad_auscultacion?: string;
  
  // Examen Neurológico (EN_)
  en_glasgow?: string;
  en_sencivilidad?: string;
  en_motricidad?: string;
  
  // Examen Ginecológico (EG_)
  eg_montedevenus?: string;
  eg_labiosmayoresmenores?: string;
  eg_clitoris?: string;
  eg_introito?: string;
  eg_vagina?: string;
  eg_fondosacovaginal?: string;
  eg_cervix?: string;
  eg_utero?: string;
  eg_anexos?: string;
  eg_examenab_va_re?: string;
  eg_especuloscopia?: string;
  eg_texto?: string;
  
  // Diabetes (DIA_)
  dia_determinacion?: string;
  dia_dieta?: string;
  dia_monitoreo?: string;
  dia_educacion?: string;
  dia_pie?: string;
  dia_dopler?: string;
  dia_curva?: string;
}

/**
 * Interface extendida con información del médico y sector
 */
export interface HCIItemWithMedicoAndSector extends HCIItem {
  profesionalNombre?: string;
  sectorDescripcion?: string;
}

/**
 * Payload para crear/actualizar HC
 */
export interface NuevaHCPayload {
  numeroVisita: number;
  fecha?: string;
  idSector?: string;
  idProfecional?: number;
  motivoConsulta?: string;
  enfermedadActual?: string;
  modMedica?: string;
  semiologia?: string;
  // Campos dinámicos por sección
  [key: string]: any;
}

/**
 * Respuesta del API
 */
export interface HCIResponse {
  success: boolean;
  data: HCIItemWithMedicoAndSector | HCIItemWithMedicoAndSector[];
  mensaje?: string;
}

/**
 * Configuración de secciones médicas
 */
export const SECCIONES_CONFIG: Record<string, string> = {
  'SV': 'Signos Vitales',
  'PF': 'Piel y Faneras',
  'TCS': 'Tejido Celular Subcutáneo',
  'SL': 'Sistema Linfático',
  'SOAM': 'Sistema Osteoarticulomuscular',
  'C': 'Cabeza',
  'CU': 'Cuello',
  'M': 'Mamas',
  'MI': 'Mamas - Inspección',
  'MP': 'Mamas - Palpación',
  'AR': 'Aparato Respiratorio',
  'AC': 'Aparato Cardiovascular',
  'A': 'Abdomen',
  'AUG': 'Aparato Urogenital',
  'AIG': 'Aparato Intestinal',
  'SN': 'Sistema Nervioso',
  'EO': 'Examen Oftalmológico',
  'EC': 'Electrocardiograma',
  'RDT': 'Radiología de Tórax',
  'PD': 'Procedimientos Diagnósticos',
  'PT': 'Procedimientos Terapéuticos',
  'AD': 'Aparato Digestivo',
  'EN': 'Examen Neurológico',
  'EG': 'Examen Ginecológico',
  'DIA': 'Diabetes'
};
