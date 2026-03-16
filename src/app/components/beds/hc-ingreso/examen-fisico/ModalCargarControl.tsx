'use client';

import { useState } from 'react';
import ModalBasePaciente from '../../../modals/ModalBasePaciente';
import RenderControlSimplificado from './RenderControlSimplificado';
import { FormData } from '../../../indicaciones/AplicarIndicacion';
import { useAppContext } from '@/app/contexts/AppContext';
import styles from '../../../indicaciones/AplicarIndicacion.module.css';

interface ModalCargarControlProps {
    isOpen: boolean;
    onClose: () => void;
    numeroVisita: number;
    idHCIngreso?: number;
    onSuccess?: () => void;
}

// Helper para obtener fecha local sin problemas de zona horaria
const getLocalDateString = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// Helper para obtener hora local en formato HH:mm
const getLocalTimeString = (date: Date): string => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
};

export default function ModalCargarControl({
    isOpen,
    onClose,
    numeroVisita,
    idHCIngreso,
    onSuccess
}: ModalCargarControlProps) {
    const { usuario } = useAppContext();
    const now = new Date();

    const [formData, setFormData] = useState<FormData>({
        fechaCumplido: getLocalDateString(now),
        horaCumplido: getLocalTimeString(now),
        observaciones: '',
        fechaProximo: '',
        horaProximo: '',
        profesionalAsiste: usuario?.valorPersonal || usuario?.idValorpersonal,
        profesionalNombre: `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim(),
        control: {
            pulso: '',
            presionArterialMax: '',
            presionArterialMin: '',
            presionArterialMedia: '',
            frResp: '',
            temperaturaAxilar: '',
            temperaturaRectal: '',
            glucemia: '',
            saturometria: '',
        },
        dieta: {
            tipoDieta: null,
        },
        medicamentoCtrl: {},
        medidaAsistencial: {},
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (field: keyof FormData, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleGuardar = async () => {
        try {
            setLoading(true);
            setError(null);

            // Validar que al menos un campo de control esté lleno
            const tieneAlgunDato = Object.values(formData.control).some(val => val !== '');
            if (!tieneAlgunDato) {
                setError('Debe ingresar al menos un dato de control');
                return;
            }

            // Preparar datos para enviar al backend
            const payload = {
                numeroVisita: String(numeroVisita),
                idHCIngreso: idHCIngreso,
                fechaControl: formData.fechaCumplido,
                horaControl: formData.horaCumplido,
                operadorCarga: usuario?.valorPersonal || usuario?.idValorpersonal,
                pulso: formData.control.pulso ? parseFloat(formData.control.pulso) : null,
                presionMax: formData.control.presionArterialMax ? parseFloat(formData.control.presionArterialMax) : null,
                presionMin: formData.control.presionArterialMin ? parseFloat(formData.control.presionArterialMin) : null,
                presionMedia: formData.control.presionArterialMedia ? parseFloat(formData.control.presionArterialMedia) : null,
                frecuenciaRespiratoria: formData.control.frResp ? parseFloat(formData.control.frResp) : null,
                temperaturaAxilar: formData.control.temperaturaAxilar ? parseFloat(formData.control.temperaturaAxilar) : null,
                temperaturaRectal: formData.control.temperaturaRectal ? parseFloat(formData.control.temperaturaRectal) : null,
                glucemia: formData.control.glucemia ? parseFloat(formData.control.glucemia) : null,
                saturacion: formData.control.saturometria ? parseFloat(formData.control.saturometria) : null,
                observaciones: formData.observaciones || null,
            };

            // Llamar al servicio backend de signos vitales
            const response = await fetch('/api/signos-vitales', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al guardar el control');
            }

            // Éxito
            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (err) {
            console.error('Error al guardar control:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido al guardar el control');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalBasePaciente
            isOpen={isOpen}
            onClose={onClose}
            titulo="Cargar Control"
            numeroVisita={String(numeroVisita)}
        >
            <div className={styles.modalContent}>
                {error && (
                    <div style={{
                        padding: '10px',
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '4px',
                        marginBottom: '15px',
                        color: '#c33'
                    }}>
                        {error}
                    </div>
                )}

                <RenderControlSimplificado
                    formData={formData}
                    handleChange={handleChange}
                />

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleGuardar}
                        disabled={loading}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#00B5E2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {loading ? 'Guardando...' : 'APLICAR'}
                    </button>
                </div>
            </div>
        </ModalBasePaciente>
    );
}
