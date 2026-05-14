'use client';

import { useState, useEffect } from 'react';
import ModalBasePaciente from '../modals/ModalBasePaciente';
import { indicacionesService } from '../../services/indicacionesService';
import type { Indicacion } from '../../types/indicaciones';
import styles from './AplicarIndicacion.module.css';
import Loader from '../Loader/Loader';
import RenderDieta from './renders_Indicacion/RenderDieta';
import RenderControl from './renders_Indicacion/RenderControl';
import RenderMedicacion from './renders_Indicacion/RenderMedicacion';
import RenderAsistencial from './renders_Indicacion/RenderAsistencial';
import {useAppContext} from "@/app/contexts/AppContext";
import { parseValorPersonalId } from '@/app/utils/valorPersonal';

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
    
    // Campos de solo lectura (vienen de la indicación)
    profesionalAsiste?: number;
    profesionalNombre?: string;
    frecuencia?: string;
    intervalo?: number;
    descripcion?: string;
    sector?: string;
    medicamento?: string;
    cantidadIndicada?: number;
    tipoUnidad?: string;
    
    // Control
    control: {
        pulso?: string;
        presionArterialMax?: string;
        presionArterialMin?: string;
        presionArterialMedia?: string;
        frResp?: string;
        temperaturaAxilar?: string;
        temperaturaRectal?: string;
        glucemia?: string;
        saturometria?: string;
    }

    dieta : {
        tipoDieta: number | null;
    },

    medicamentoCtrl: {
        sector?: string;
        cantidadIndicada?: number;
        cantidad?: number;
        tipoUnidad?: string;
    },
    medidaAsistencial: {
        valorSector?: string;
    }
}

export interface Payload extends FormData {
    nroIndicacion: number;
    numeroVisita: string;
    tipoIndicacion: 'C' | 'M' | 'A' | 'D';
    fechaCumplido: string;
    profesionalAsiste?: number;
    operadorCarga?: number;
    horaCumplido: string;
    fechaProximo: string;
    horaProximo: string;
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
    const date = new Date();
    const { isOpen, onClose, numeroVisita, nroIndicacion, tipoIndicacion, onSuccess } = props;
    const {usuario} = useAppContext()

    const [formData, setFormData] = useState<FormData>({
        fechaCumplido: getLocalDateString(date),
        horaCumplido: getLocalTimeString(date),
        observaciones: '',
        fechaProximo: '',
        horaProximo: '',
        profesionalAsiste: parseValorPersonalId(
            usuario?.codigoOperador,
            usuario?.valorPersonal,
            usuario?.idValorpersonal,
        ),
        control: {
            pulso: '',
            presionArterialMax: '',
            presionArterialMin: '',
            presionArterialMedia: '',
            frResp: '',
            temperaturaAxilar: '',
            temperaturaRectal: '',
            glucemia: '',
            saturometria: ''
        },
        dieta: {
            tipoDieta: null
        },
        medicamentoCtrl: {},
        medidaAsistencial: {}
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
                    profesionalAsiste: parseValorPersonalId(
                        usuario?.codigoOperador,
                        usuario?.valorPersonal,
                        usuario?.idValorpersonal,
                    ),
                    profesionalNombre: data.OperadorApellido && data.OperadorNombres
                        ? `${data.OperadorApellido}, ${data.OperadorNombres}`
                        : 'N/A',
                    frecuencia: data.Frecuencia || '',
                    intervalo: data.Intervalo || undefined,
                    observaciones: data.Observaciones || '',
                    descripcion: data.AliasMedicamento || '',
                    sector: data.IdSector || '',
                    medicamento: data.AliasMedicamento || '',
                    cantidadIndicada: data.CantidadIndicada || undefined,
                    tipoUnidad: data.TipoUnidad || '',

                    fechaCumplido: fechaCumplidoInicial,
                    horaCumplido: horaCumplidoInicial,

                    // ✅ Corregir estructura de control
                    control: {
                        pulso: "",
                        presionArterialMax: '',
                        presionArterialMin: '',
                        presionArterialMedia: '',
                        frResp: '',
                        temperaturaAxilar: '',
                        temperaturaRectal: '',
                        glucemia: '',
                        saturometria: ''
                    },

                    dieta: {
                        tipoDieta: null
                    },
                    medicamentoCtrl: {}
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
    const convertirIntervaloClarionAHoras = (intervalo?: number | null): number => {
        if (!intervalo) return 0;

        // El intervalo en Clarion representa un tiempo en centésimas de segundo desde medianoche
        // Para convertirlo a horas: dividir por 360000 (100 centésimas * 60 segundos * 60 minutos)
        return  intervalo / 360000 ;
    };

    // ✅ Calcular fecha y hora próxima basándose en fechaCumplido + horaCumplido + frecuenciaHoras
    useEffect(() => {
        if (formData.fechaCumplido && formData.horaCumplido && formData.intervalo && formData.intervalo > 0) {
            const frecuenciaHoras = convertirIntervaloClarionAHoras(formData.intervalo)
            // Crear fecha desde los valores del formulario
            const fechaHoraCumplido = new Date(`${formData.fechaCumplido}T${formData.horaCumplido}`);
            
            // Sumar las horas de frecuencia
            const fechaHoraProximo = new Date(
                fechaHoraCumplido.getTime() + frecuenciaHoras * 60 * 60 * 1000
            );
            
            // ✅ Usar helpers para evitar problemas de zona horaria
            setFormData(prev => ({
                ...prev,
                fechaProximo: getLocalDateString(fechaHoraProximo),
                horaProximo: getLocalTimeString(fechaHoraProximo),
            }));
        }
    }, [formData.fechaCumplido, formData.horaCumplido, formData.intervalo]);

    const handleChange = (field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    //función helper para actualizar control
    const handleControlChange = (field: keyof FormData['control'], value: string) => {
        setFormData(prev => ({
            ...prev,
            control: {
                ...prev.control,
                [field]: value
            }
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            const payload: Payload = {
                nroIndicacion,
                numeroVisita,
                tipoIndicacion,
                fechaCumplido: formData.fechaCumplido,
                horaCumplido: formData.horaCumplido,
                fechaProximo: formData.fechaProximo,
                horaProximo: formData.horaProximo,
                observaciones: formData.observaciones || '',
                profesionalAsiste: formData.profesionalAsiste,
                operadorCarga: parseValorPersonalId(
                    usuario?.codigoOperador,
                    usuario?.valorPersonal,
                    usuario?.idValorpersonal,
                ),
                control: {}, // Inicializar vacío
                dieta: {
                    tipoDieta: null
                },
                medicamentoCtrl: {},
                medidaAsistencial: {}
            };

            // ✅ Enviar SOLO los campos de control que tienen valor
            if (tipoIndicacion === 'C') {
                Object.entries(formData.control).forEach(([key, value]) => {
                    if (value && value.trim() !== '') {
                        (payload.control as any)[key] = value;
                    }
                });
            }

            if (tipoIndicacion === 'D') {
                payload.dieta.tipoDieta =  Number(indicacionOriginal?.TipoIndicacion)
            }

            if (tipoIndicacion === 'M') {
                payload.medicamentoCtrl = {
                    cantidad: Number(indicacionOriginal?.Cantidad),
                    cantidadIndicada: Number(indicacionOriginal?.CantidadIndicada),
                    sector: indicacionOriginal?.IdSector || "",
                    tipoUnidad: indicacionOriginal?.TipoUnidad || ""
                }
            }

            if (tipoIndicacion === 'A') {
                payload.medidaAsistencial.valorSector = indicacionOriginal?.IdSector || ""
            }

            console.log('Enviando payload:', payload);
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
                <div style={{ position: 'relative', minHeight: '200px' }}>
                    <Loader />
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
                        <RenderControl formData={formData} handleChange={handleChange}
                                       />
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