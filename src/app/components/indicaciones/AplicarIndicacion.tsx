'use client';

import { useState, useEffect } from 'react';
import ModalBasePaciente from '../modals/ModalBasePaciente';
import { indicacionesService } from '../../services/indicacionesService';
import type { Indicacion } from '../../types/indicaciones';
import styles from './AplicarIndicacion.module.css';
import RenderDieta from './renders_Indicacion/RenderDieta';
import RenderControl from './renders_Indicacion/RenderControl';
import RenderMedicacion from './renders_Indicacion/RenderMedicacion';
import RenderAsistencial from './renders_Indicacion/RenderAsistencial';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    numeroVisita: string;
    nroIndicacion: number;
    tipoIndicacion: 'C' | 'M' | 'A' | 'D';
    onSuccess?: () => void;
}

export interface FormData {
    // Campos que editará el usuario
    fechaCumplido: string;
    horaCumplido: string;
    observaciones: string;
    
    // Campos calculados
    fechaProximo: string;
    horaProximo: string;
    frecuenciaHoras: number;
    
    // Campos de solo lectura (vienen de la indicación)
    profesionalAsiste?: number;
    profesionalNombre?: string;
    frecuencia?: string;
    descripcion?: string;
    sector?: string;
    medicamento?: string;
    cantidadIndicada?: number;
    tipoUnidad?: string;
    
    // Control
    pulsoMax?: string;
    pulsoMin?: string;
    presionArterialMax?: string;
    presionArterialMin?: string;
    presionArterialMedia?: string;
    frResp?: string;
    temperaturaAxilar?: string;
    temperaturaRectal?: string;
    controlGlucemia?: string;
    saturometria?: string;
}

// ✅ Helper para obtener fecha local sin problemas de zona horaria
const getLocalDateString = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// ✅ Helper para obtener hora local en formato HH:mm
const getLocalTimeString = (date: Date): string => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
};

export default function AplicarIndicacion(props: Props) {
    const { isOpen, onClose, numeroVisita, nroIndicacion, tipoIndicacion, onSuccess } = props;
    
    const [formData, setFormData] = useState<FormData>({
        // ✅ Inicializar con la fecha/hora actual como DEFAULT para el usuario
        fechaCumplido: getLocalDateString(new Date()),
        horaCumplido: getLocalTimeString(new Date()),
        observaciones: '',
        fechaProximo: '',
        horaProximo: '',
        frecuenciaHoras: 0,
    });
    
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [indicacionOriginal, setIndicacionOriginal] = useState<Indicacion | null>(null);

    // Cargar datos de la indicación
    useEffect(() => {
        if (!isOpen || !nroIndicacion) return;

        const cargarIndicacion = async () => {
            setLoadingData(true);
            setError(null);
            try {
                const data = await indicacionesService.getIndicacionesByNroIndicacion(nroIndicacion);
                
                if (!data) {
                    throw new Error('No se encontró la indicación');
                }
                
                console.log('Datos de indicación:', data);
                setIndicacionOriginal(data);
                
                // ✅ Usar fecha/hora actual por defecto (el usuario puede aplicar "ahora")
                const fechaCumplidoInicial = getLocalDateString(new Date());
                const horaCumplidoInicial = getLocalTimeString(new Date());

                setFormData(prev => ({
                    ...prev,
                    // Datos de la indicación
                    profesionalAsiste: data.ProfesionalAsiste || undefined,
                    profesionalNombre: data.OperadorApellido && data.OperadorNombres 
                        ? `${data.OperadorApellido}, ${data.OperadorNombres}`
                        : 'N/A',
                    frecuencia: data.Frecuencia || '',
                    frecuenciaHoras: parseFrecuencia(data.Frecuencia),
                    observaciones: data.Observaciones || '',
                    descripcion: data.AliasMedicamento || '',
                    sector: data.IdSector || '',
                    medicamento: data.AliasMedicamento || '',
                    cantidadIndicada: data.CantidadIndicada || undefined,
                    tipoUnidad: data.TipoUnidad || '',
                    
                    // ✅ Fecha/hora actual para nueva aplicación
                    fechaCumplido: fechaCumplidoInicial,
                    horaCumplido: horaCumplidoInicial,
                    
                    // Control - inicializar vacíos
                    ...(tipoIndicacion === 'C' && {
                        pulsoMax: '',
                        pulsoMin: '',
                        presionArterialMax: '',
                        presionArterialMin: '',
                        presionArterialMedia: '',
                        frResp: '',
                        temperaturaAxilar: '',
                        temperaturaRectal: '',
                        controlGlucemia: '',
                        saturometria: '',
                    }),
                }));
            } catch (err: any) {
                console.error('Error al cargar indicación:', err);
                setError(err.message || 'Error al cargar los datos');
            } finally {
                setLoadingData(false);
            }
        };
        
        cargarIndicacion();
    }, [isOpen, nroIndicacion, tipoIndicacion]);

    // Parsear frecuencia (ej: "CADA 6 HS" -> 6)
    const parseFrecuencia = (frecuencia?: string | null): number => {
        if (!frecuencia) return 0;
        const match = frecuencia.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    };

    // ✅ Calcular fecha y hora próxima basándose en fechaCumplido + horaCumplido + frecuenciaHoras
    useEffect(() => {
        if (formData.fechaCumplido && formData.horaCumplido && formData.frecuenciaHoras > 0) {
            // Crear fecha desde los valores del formulario
            const fechaHoraCumplido = new Date(`${formData.fechaCumplido}T${formData.horaCumplido}`);
            
            // Sumar las horas de frecuencia
            const fechaHoraProximo = new Date(
                fechaHoraCumplido.getTime() + formData.frecuenciaHoras * 60 * 60 * 1000
            );
            
            // ✅ Usar helpers para evitar problemas de zona horaria
            setFormData(prev => ({
                ...prev,
                fechaProximo: getLocalDateString(fechaHoraProximo),
                horaProximo: getLocalTimeString(fechaHoraProximo),
            }));
        }
    }, [formData.fechaCumplido, formData.horaCumplido, formData.frecuenciaHoras]);

    const handleChange = (field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Preparar el payload con TODOS los datos necesarios
            const payload: any = {
                nroIndicacion,
                numeroVisita,
                tipoIndicacion,
                fechaCumplido: formData.fechaCumplido,
                horaCumplido: formData.horaCumplido,
                fechaProximo: formData.fechaProximo,
                horaProximo: formData.horaProximo,
                observaciones: formData.observaciones || '',
            };

            // Agregar campos específicos según el tipo
            if (tipoIndicacion === 'C') {
                // Solo enviar los campos de control que tienen valor
                if (formData.pulsoMax) payload.pulsoMax = formData.pulsoMax;
                if (formData.pulsoMin) payload.pulsoMin = formData.pulsoMin;
                if (formData.presionArterialMax) payload.presionArterialMax = formData.presionArterialMax;
                if (formData.presionArterialMin) payload.presionArterialMin = formData.presionArterialMin;
                if (formData.presionArterialMedia) payload.presionArterialMedia = formData.presionArterialMedia;
                if (formData.frResp) payload.frResp = formData.frResp;
                if (formData.temperaturaAxilar) payload.temperaturaAxilar = formData.temperaturaAxilar;
                if (formData.temperaturaRectal) payload.temperaturaRectal = formData.temperaturaRectal;
                if (formData.controlGlucemia) payload.controlGlucemia = formData.controlGlucemia;
                if (formData.saturometria) payload.saturometria = formData.saturometria;
            }

            console.log('Enviando payload:', payload);

            // Enviar todo al backend
            await indicacionesService.aplicarIndicacion(payload);

            onSuccess?.();
            onClose();
        } catch (err: any) {
            console.error('Error al aplicar indicación:', err);
            setError(err.message || 'Error al aplicar la indicación');
        } finally {
            setLoading(false);
        }
    };

    const getTitulo = () => {
        switch (tipoIndicacion) {
            case 'D': return 'Aplicar Dieta';
            case 'C': return 'Aplicar Control';
            case 'M': return 'Aplicar Medicación';
            case 'A': return 'Aplicar Asistencial';
            default: return 'Aplicar Indicación';
        }
    };

    const footerButtons = (
        <button 
            className={styles.acceptButton} 
            onClick={handleSubmit}
            disabled={loading || loadingData}
        >
            {loading ? 'Aplicando...' : 'Aplicar'}
        </button>
    );

    return (
        <ModalBasePaciente
            isOpen={isOpen}
            onClose={onClose}
            titulo={getTitulo()}
            numeroVisita={numeroVisita}
            footerButtons={footerButtons}
        >
            {loadingData ? (
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Cargando datos de la indicación...</p>
                </div>
            ) : error ? (
                <div className={styles.errorContainer}>
                    <p className={styles.errorMessage}>{error}</p>
                    <button onClick={onClose} className={styles.errorButton}>
                        Cerrar
                    </button>
                </div>
            ) : (
                <div className={styles.formContainer}>
                    {tipoIndicacion === 'D' && (
                        <RenderDieta formData={formData} handleChange={handleChange} />
                    )}

                    {tipoIndicacion === 'C' && (
                        <RenderControl formData={formData} handleChange={handleChange} />
                    )}

                    {tipoIndicacion === 'M' && (
                        <RenderMedicacion formData={formData} handleChange={handleChange} />
                    )}

                    {tipoIndicacion === 'A' && (
                        <RenderAsistencial formData={formData} handleChange={handleChange} />
                    )}
                </div>
            )}
        </ModalBasePaciente>
    );
}