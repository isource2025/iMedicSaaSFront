'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './ModalBasePaciente.module.css';
import { formatDate, formatTime, clarionDateToDate } from '../../utils/dateUtils';
import { usePatients } from '../../hooks/usePatients';
import visitaMovimientoService from '../../services/visitaMovimientoService';

interface PacienteData {
  numeroVisita: string;
  idPaciente: string;
  apellidoYNombre: string;
  numeroDocumento: string;
  fechaAdmision: string;
  horaAdmision?: string;
  FechaAdmisionClarion?: number; // Formato Clarion
  HoraAdmisionClarion?: number; // Formato Clarion
  sexo: string;
  fechaNacimiento: string;
  valorSector: string;
  valorHabitacionCama: string;
  coberturaSocial: string;
}

interface ModalBasePacienteProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  numeroVisita: string;
  children: React.ReactNode;
  footerButtons?: React.ReactNode;
}

const ModalBasePaciente: React.FC<ModalBasePacienteProps> = ({
  isOpen,
  onClose,
  titulo,
  numeroVisita,
  children,
  footerButtons,
}) => {
  const { allPatients } = usePatients();
  const modalRef = useRef<HTMLDivElement>(null);

  const [pacienteData, setPacienteData] = useState<PacienteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edad, setEdad] = useState<number | null>(null);
  const [yaConsultado, setYaConsultado] = useState(false);

  const cargarDatosPaciente = useCallback(async () => {
    if (!isOpen || !numeroVisita || yaConsultado) return;

    setLoading(true);
    setError(null);

    try {
      // Obtener datos de la cama
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/beds`);
      if (!res.ok) throw new Error('Error al obtener información del paciente');

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error al obtener datos');

      // Obtener datos del último movimiento de la visita
      const movimiento = await visitaMovimientoService.getUltimoMovimiento(numeroVisita);
      
      const cama = data.data.find((c: any) => String(c.NumeroVisita) === numeroVisita);
      if (cama) {
        const pacienteInfo = allPatients.find(p => p.IDPaciente === Number(cama.IdPaciente));

        // Fecha y hora de admisión desde el movimiento o desde la cama
        const fechaAdmisionISO = cama.FechaIngreso 
          ? clarionDateToDate(cama.FechaIngreso)?.toISOString() || new Date().toISOString()
          : new Date().toISOString();

        const pd: PacienteData = {
          numeroVisita,
          idPaciente: cama.IdPaciente || 'N/A',
          apellidoYNombre: pacienteInfo?.ApellidoyNombre || cama.NombrePaciente || 'N/A',
          numeroDocumento: cama.DocumentoPaciente || 'N/A',
          fechaAdmision: fechaAdmisionISO,
          // Agregar datos de fecha y hora desde el movimiento si existen
          FechaAdmisionClarion: movimiento?.FechaAdmision,
          HoraAdmisionClarion: movimiento?.HoraAdmision,
          sexo: pacienteInfo?.Sexo || cama.SexoPaciente || 'N/A',
          fechaNacimiento: pacienteInfo?.FechaNacimiento || '',
          valorSector: cama.ValorSector || 'N/A',
          valorHabitacionCama: cama.ValorHabitacionCama || 'N/A',
          coberturaSocial: cama.RazonSocialCliente || 'N/A',
        };

        setPacienteData(pd);

        if (pd.fechaNacimiento) {
          const fn = new Date(pd.fechaNacimiento);
          const hoy = new Date();
          let calc = hoy.getFullYear() - fn.getFullYear();
          const m = hoy.getMonth() - fn.getMonth();
          if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) calc--;
          setEdad(calc);
        }
      } else {
        setPacienteData({
          numeroVisita,
          idPaciente: 'N/A',
          apellidoYNombre: 'Paciente',
          numeroDocumento: 'N/A',
          fechaAdmision: new Date().toISOString(),
          sexo: 'N/A',
          fechaNacimiento: '',
          valorSector: 'N/A',
          valorHabitacionCama: 'N/A',
          coberturaSocial: 'N/A',
        });
      }
      setYaConsultado(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al cargar datos del paciente');
      setPacienteData(null);
    } finally {
      setLoading(false);
    }
  }, [isOpen, numeroVisita, yaConsultado, allPatients]);

  useEffect(() => {
    if (isOpen) {
      if (pacienteData?.numeroVisita !== numeroVisita) setYaConsultado(false);
      cargarDatosPaciente();
    }
  }, [isOpen, numeroVisita, cargarDatosPaciente, pacienteData?.numeroVisita]);

  if (!isOpen) return null;

  const iconoSexo =
    pacienteData?.sexo === 'M' ? '♂️' : pacienteData?.sexo === 'F' ? '♀️' : '⚧';
  const claseSexo =
    pacienteData?.sexo === 'M'
      ? styles.masculino
      : pacienteData?.sexo === 'F'
      ? styles.femenino
      : styles.otro;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer} ref={modalRef}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitulo}>{titulo}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loading}>Cargando información del paciente...</div>
          </div>
        ) : error || !pacienteData ? (
          <div className={styles.errorContainer}>
            <div className={styles.error}>{error || 'No se pudo obtener la información'}</div>
          </div>
        ) : (
          <>
            <div className={styles.pacienteHeader}>
              <div className={styles.cardHeader}>
                <div className={styles.bedInfo}>
                  <div>
                    <span className={styles.sectorLabel}>{pacienteData.valorSector}</span>
                    <span className={styles.bedNumber}>{pacienteData.valorHabitacionCama}</span>
                  </div>
                  {Number(pacienteData.numeroVisita) > 0 && (
                    <div className={styles.numeroVisita}>
                      Nº De Visita <strong>{pacienteData.numeroVisita}</strong>
                    </div>
                  )}
                </div>

                <div className={styles.pacienteData}>
                  <div>
                    <span className={styles.documentoNumero}>{pacienteData.numeroDocumento}</span>
                    <span className={styles.edadPaciente}>{edad !== null ? `${edad} años` : ''}</span>
                    <span className={`${styles.sexoIcono} ${claseSexo}`}>{iconoSexo}</span>
                    <h3>{pacienteData.apellidoYNombre}</h3>

                    <div className={styles.headerFields}>
                      <div className={styles.headerField}>
                        <span className={styles.headerLabel}>Fecha de ingreso</span>
                        <span className={styles.headerValue}>
                          {pacienteData.FechaAdmisionClarion 
                            ? formatDate(pacienteData.FechaAdmisionClarion, { isClarionDate: true }) 
                            : formatDate(pacienteData.fechaAdmision)}
                        </span>
                      </div>
                      <div className={styles.headerField}>
                        <span className={styles.headerLabel}>Hora de ingreso</span>
                        <span className={styles.headerValue}>
                          {pacienteData.HoraAdmisionClarion 
                            ? formatTime(pacienteData.HoraAdmisionClarion.toString()) 
                            : '-'}
                        </span>
                      </div>
                      <div className={styles.headerField}>
                        <span className={styles.headerLabel}>Cobertura</span>
                        <span className={styles.headerValue}>{pacienteData.coberturaSocial}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.separador}></div>

            <div className={styles.modalContent}>
              {children}
            </div>

            <div className={styles.modalFooter}>
              {footerButtons}
              <button className={styles.cancelButton} onClick={onClose}>Cerrar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalBasePaciente;
