'use client';

import { useState, useEffect } from 'react';
import styles from './ModalBasePaciente.module.css';

interface PacienteData {
  numeroVisita: string;
  idPaciente: string;
  apellidoYNombre: string;
  numeroDocumento: string; 
  fechaAdmision: string;
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
}

const ModalBasePaciente: React.FC<ModalBasePacienteProps> = ({
  isOpen,
  onClose,
  titulo,
  numeroVisita,
  children
}) => {
  const [pacienteData, setPacienteData] = useState<PacienteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edad, setEdad] = useState<number | null>(null);
  const [reducido, setReducido] = useState(false);

  useEffect(() => {
    if (isOpen && numeroVisita) {
      fetchPacienteData();
    }
  }, [isOpen, numeroVisita]);

  const fetchPacienteData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/beds`);
      
      if (!response.ok) {
        throw new Error('Error al obtener información del paciente');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const camaConVisita = data.data.find((cama: any) => 
          cama.NumeroVisita && String(cama.NumeroVisita) === numeroVisita
        );
        
        if (camaConVisita) {
          setPacienteData({
            numeroVisita: numeroVisita,
            idPaciente: camaConVisita.IdPaciente || 'N/A',
            apellidoYNombre: camaConVisita.NombrePaciente || 'N/A',
            numeroDocumento: camaConVisita.DocumentoPaciente || 'N/A',
            fechaAdmision: camaConVisita.FechaIngreso ? new Date(camaConVisita.FechaIngreso).toISOString() : new Date().toISOString(),
            sexo: camaConVisita.SexoPaciente || 'N/A',
            fechaNacimiento: '', 
            valorSector: camaConVisita.ValorSector || 'N/A',
            valorHabitacionCama: camaConVisita.ValorHabitacionCama || 'N/A',
            coberturaSocial: camaConVisita.RazonSocialCliente || 'N/A'
          });
          
          if (!camaConVisita.fechaNacimiento) {
            setEdad(null);
          }
        } else {
          setPacienteData({
            numeroVisita: numeroVisita,
            idPaciente: 'N/A',
            apellidoYNombre: 'Paciente',
            numeroDocumento: 'N/A',
            fechaAdmision: new Date().toISOString(),
            sexo: 'N/A',
            fechaNacimiento: '',
            valorSector: 'N/A',
            valorHabitacionCama: 'N/A',
            coberturaSocial: 'N/A'
          });
        }
      } else {
        throw new Error(data.message || 'No se pudo obtener la información del paciente');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos del paciente');
      console.error('Error al cargar datos del paciente:', err);
      
      setPacienteData({
        numeroVisita: numeroVisita,
        idPaciente: 'N/A',
        apellidoYNombre: 'Paciente',
        numeroDocumento: 'N/A',
        fechaAdmision: new Date().toISOString(),
        sexo: 'N/A',
        fechaNacimiento: '',
        valorSector: 'N/A',
        valorHabitacionCama: 'N/A',
        coberturaSocial: 'N/A'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pacienteData?.fechaNacimiento) {
      const fechaNac = new Date(pacienteData.fechaNacimiento);
      const hoy = new Date();
      let edad = hoy.getFullYear() - fechaNac.getFullYear();
      const mes = hoy.getMonth() - fechaNac.getMonth();
      
      if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
        edad--;
      }
      
      setEdad(edad);
    }
  }, [pacienteData?.fechaNacimiento]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContainer}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitulo}>{titulo}</h2>
            <button className={styles.closeButton} onClick={onClose}>×</button>
          </div>
          <div className={styles.loadingContainer}>
            <div className={styles.loading}>Cargando información del paciente...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pacienteData) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContainer}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitulo}>{titulo}</h2>
            <button className={styles.closeButton} onClick={onClose}>×</button>
          </div>
          <div className={styles.errorContainer}>
            <div className={styles.error}>{error || 'No se pudo obtener la información del paciente'}</div>
          </div>
        </div>
      </div>
    );
  }

  const formatearFecha = (fechaStr: string): string => {
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return fechaStr;
    }
  };
  
  const iconoSexo = pacienteData.sexo === 'M' ? '♂️' : pacienteData.sexo === 'F' ? '♀️' : '⚧';
  
  const claseSexo = pacienteData.sexo === 'M' ? styles.masculino : 
                     pacienteData.sexo === 'F' ? styles.femenino : 
                     styles.otro;

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContainer}${reducido ? ' ' + styles.reducido : ''}`}>
        <button
          className={styles.resizeButton}
          onClick={() => setReducido(r => !r)}
          title={reducido ? 'Restaurar tamaño' : 'Reducir tamaño'}
        >
          {reducido ? '⤢' : '⤡'}
        </button>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitulo}>{titulo}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.pacienteHeader}>
          <div className={styles.headerInfoFields}>
            <div className={styles.headerField}>
              <span className={styles.headerLabel}>ID:</span>
              <span className={styles.headerValue}>{pacienteData.idPaciente}</span>
            </div>
            <div className={styles.headerField}>
              <span className={styles.headerLabel}>Visita:</span>
              <span className={styles.headerValue}>{pacienteData.numeroVisita}</span>
            </div>
            <div className={styles.headerField}>
              <span className={styles.headerLabel}>Sector:</span>
              <span className={styles.headerValue}>{pacienteData.valorSector}</span>
            </div>
            <div className={styles.headerField}>
              <span className={styles.headerLabel}>Cama:</span>
              <span className={styles.headerValue}>{pacienteData.valorHabitacionCama}</span>
            </div>
            <div className={styles.headerField}>
              <span className={styles.headerLabel}>Fecha:</span>
              <span className={styles.headerValue}>{formatearFecha(pacienteData.fechaAdmision)}</span>
            </div>
            <div className={styles.headerField}>
              <span className={styles.headerLabel}>Cobertura:</span>
              <span className={styles.headerValue}>{pacienteData.coberturaSocial}</span>
            </div>
          </div>
          
          <div className={styles.nombrePaciente}>
            <h3>
              <span className={styles.documentoNumero}>{pacienteData.numeroDocumento}</span>
              {pacienteData.apellidoYNombre}
              <span className={`${styles.sexoIcono} ${claseSexo}`}>{iconoSexo}</span>
              <span className={styles.edadPaciente}>{edad !== null ? `${edad} años` : ''}</span>
            </h3>
          </div>
        </div>
        
        <div className={styles.separador}></div>
        
        <div className={styles.modalContent}>
          {children}
        </div>
        
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalBasePaciente;
