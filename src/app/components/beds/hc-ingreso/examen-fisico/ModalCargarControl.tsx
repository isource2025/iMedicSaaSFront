'use client';

import { useState } from 'react';
import ModalBasePaciente from '../../../modals/ModalBasePaciente';
import RenderControlSimplificado from './RenderControlSimplificado';
import { FormData } from '../../../indicaciones/AplicarIndicacion';
import { useAppContext } from '@/app/contexts/AppContext';
import {
    getSessionUser,
    getUserDisplayName,
    getHcIdProfesional,
} from '@/app/utils/sessionUser';
import styles from '../../../indicaciones/AplicarIndicacion.module.css';

export interface ControlDatosCargados {
    pa: string;
    fc: string;
    fr: string;
    tax: string;
    glucemia: string;
    saturacion: string;
}

interface ModalCargarControlProps {
    isOpen: boolean;
    onClose: () => void;
    numeroVisita: number;
    idHCIngreso?: number;
    onSuccess?: (datos?: ControlDatosCargados) => void;
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
    const usuarioActual = getSessionUser(usuario);

    const [formData, setFormData] = useState<FormData>({
        fechaCumplido: getLocalDateString(now),
        horaCumplido: getLocalTimeString(now),
        observaciones: '',
        fechaProximo: '',
        horaProximo: '',
        profesionalAsiste: getHcIdProfesional(usuarioActual),
        profesionalNombre: getUserDisplayName(usuarioActual),
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

            // En HC de ingreso solo cargamos los datos al formulario.
            // La persistencia en `imInterCtrlFrecuente` se hace al guardar la HC.
            const datosCargados: ControlDatosCargados = {
                pa: formData.control.presionArterialMax && formData.control.presionArterialMin
                    ? `${formData.control.presionArterialMax}/${formData.control.presionArterialMin}`
                    : '',
                fc: formData.control.pulso || '',
                fr: formData.control.frResp || '',
                tax: formData.control.temperaturaAxilar || '',
                glucemia: formData.control.glucemia || '',
                saturacion: formData.control.saturometria || '',
            };

            if (onSuccess) {
                onSuccess(datosCargados);
            }
            onClose();
        } catch (err) {
            console.error('Error al guardar control:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido al guardar el control');
        } finally {
            setLoading(false);
        }
    };

    const footerButtons = (
        <button 
            className={styles.acceptButton} 
            onClick={handleGuardar}
            disabled={loading}
        >
            {loading ? 'Guardando...' : 'APLICAR'}
        </button>
    );

    return (
        <ModalBasePaciente
            isOpen={isOpen}
            onClose={onClose}
            titulo="Cargar Control"
            numeroVisita={String(numeroVisita)}
            footerButtons={footerButtons}
        >
            {error ? (
                <div className={styles.errorContainer}>
                    <p className={styles.errorMessage}>{error}</p>
                    <button onClick={onClose} className={styles.errorButton}>
                        Cerrar
                    </button>
                </div>
            ) : (
                <div className={styles.formContainer}>
                    <RenderControlSimplificado
                        formData={formData}
                        handleChange={handleChange}
                    />
                </div>
            )}
        </ModalBasePaciente>
    );
}
